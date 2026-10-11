-- TripSplit initial schema
--
-- Members are rows in trip_members, not auth users. That lets you add a friend
-- who never installs the app ("Wei Ming") and still split with them. When that
-- friend does sign in through the invite link, they claim their existing row,
-- so nothing they were already part of has to be re-entered.
--
-- Expenses reference members by id rather than display name, so renaming
-- someone never orphans their history.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  base_currency text not null default 'SGD' check (base_currency ~ '^[A-Z]{3}$'),
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  status text not null default 'active' check (status in ('active', 'settled'))
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  paynow_number text check (paynow_number is null or char_length(paynow_number) <= 20),
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- "Sarah" and "sarah" in the same trip would be a nightmare to settle.
create unique index trip_members_unique_name
  on public.trip_members (trip_id, lower(btrim(display_name)));

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  added_by uuid references public.trip_members(id) on delete set null,
  created_at timestamptz not null default now(),
  description text not null check (char_length(description) between 1 and 120),
  amount_original numeric not null check (amount_original > 0),
  currency_original text not null check (currency_original ~ '^[A-Z]{3}$'),
  amount_base_currency numeric not null check (amount_base_currency >= 0),
  exchange_rate numeric check (exchange_rate is null or exchange_rate > 0),
  category text not null default 'other'
    check (category in ('food', 'transport', 'accommodation', 'activities', 'shopping', 'other')),
  paid_by uuid not null references public.trip_members(id) on delete restrict,
  split_among uuid[] not null check (cardinality(split_among) > 0),
  photo_url text
);

-- Transfers people have actually made while settling up. They feed back into
-- the balance calculation, so "mark as paid" shrinks the remaining plan.
create table public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_member uuid not null references public.trip_members(id) on delete cascade,
  to_member uuid not null references public.trip_members(id) on delete cascade,
  amount numeric not null check (amount > 0),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_member <> to_member)
);

create index idx_expenses_trip on public.trip_expenses (trip_id, created_at desc);
create index idx_members_trip on public.trip_members (trip_id);
create index idx_members_user on public.trip_members (user_id);
create index idx_payments_trip on public.settlement_payments (trip_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Integrity: everyone on an expense or payment must belong to that trip
-- ---------------------------------------------------------------------------

create or replace function public.validate_expense_members()
returns trigger
language plpgsql
as $$
declare
  unknown_count int;
begin
  if not exists (
    select 1 from public.trip_members where id = new.paid_by and trip_id = new.trip_id
  ) then
    raise exception 'paid_by is not a member of this trip';
  end if;

  select count(*) into unknown_count
  from unnest(new.split_among) as m(id)
  where not exists (
    select 1 from public.trip_members tm where tm.id = m.id and tm.trip_id = new.trip_id
  );

  if unknown_count > 0 then
    raise exception 'split_among contains someone who is not in this trip';
  end if;

  return new;
end;
$$;

create trigger trip_expenses_validate_members
  before insert or update on public.trip_expenses
  for each row execute function public.validate_expense_members();

create or replace function public.validate_payment_members()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.trip_members
    where trip_id = new.trip_id and id in (new.from_member, new.to_member)
  ) <> 2 then
    raise exception 'both people in a payment must be members of this trip';
  end if;
  return new;
end;
$$;

create trigger settlement_payments_validate_members
  before insert or update on public.settlement_payments
  for each row execute function public.validate_payment_members();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- security definer so policies on trip_members can call it without recursing
-- back into trip_members' own RLS.
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_active(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.trips where id = p_trip_id and status = 'active');
$$;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_expenses enable row level security;
alter table public.settlement_payments enable row level security;

-- trips: inserts only happen through create_trip() below
create policy "trips_select_members" on public.trips
  for select using (created_by = auth.uid() or public.is_trip_member(id));
create policy "trips_update_members" on public.trips
  for update using (public.is_trip_member(id)) with check (public.is_trip_member(id));
create policy "trips_delete_creator" on public.trips
  for delete using (created_by = auth.uid());

-- trip_members
create policy "members_select" on public.trip_members
  for select using (public.is_trip_member(trip_id));

-- Members can add friends who don't have an account yet.
create policy "members_insert_placeholder" on public.trip_members
  for insert with check (public.is_trip_member(trip_id) and user_id is null);

-- You can edit your own row (PayNow number) or an unclaimed placeholder, but
-- you can never attach someone else's account to a row.
create policy "members_update" on public.trip_members
  for update using (
    public.is_trip_member(trip_id) and (user_id = auth.uid() or user_id is null)
  ) with check (user_id is null or user_id = auth.uid());

-- Only placeholders can be removed. The FK on trip_expenses.paid_by stops this
-- for anyone who has already paid for something.
create policy "members_delete_placeholder" on public.trip_members
  for delete using (public.is_trip_member(trip_id) and user_id is null);

-- trip_expenses
create policy "expenses_select" on public.trip_expenses
  for select using (public.is_trip_member(trip_id));
create policy "expenses_insert" on public.trip_expenses
  for insert with check (public.is_trip_member(trip_id) and public.is_trip_active(trip_id));
create policy "expenses_update" on public.trip_expenses
  for update using (public.is_trip_member(trip_id) and public.is_trip_active(trip_id));
create policy "expenses_delete" on public.trip_expenses
  for delete using (public.is_trip_member(trip_id) and public.is_trip_active(trip_id));

-- settlement_payments
create policy "payments_select" on public.settlement_payments
  for select using (public.is_trip_member(trip_id));
create policy "payments_insert" on public.settlement_payments
  for insert with check (public.is_trip_member(trip_id) and recorded_by = auth.uid());
create policy "payments_delete" on public.settlement_payments
  for delete using (public.is_trip_member(trip_id) and public.is_trip_active(trip_id));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Creates a trip, the creator's member row and any placeholder friends in one
-- transaction, so a half-created trip can never exist.
create or replace function public.create_trip(
  p_name text,
  p_base_currency text,
  p_display_name text,
  p_paynow_number text default null,
  p_other_members text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.trips (created_by, name, base_currency)
  values (auth.uid(), btrim(p_name), upper(p_base_currency))
  returning id into v_trip_id;

  insert into public.trip_members (trip_id, user_id, display_name, paynow_number)
  values (v_trip_id, auth.uid(), btrim(p_display_name), nullif(btrim(p_paynow_number), ''));

  foreach v_name in array coalesce(p_other_members, '{}') loop
    if char_length(btrim(v_name)) > 0 then
      insert into public.trip_members (trip_id, display_name)
      values (v_trip_id, btrim(v_name))
      on conflict do nothing;
    end if;
  end loop;

  return v_trip_id;
end;
$$;

-- What the invite page needs before you've joined: the trip name and which
-- names are still unclaimed. Nothing about expenses leaks through here.
create or replace function public.get_trip_invite(p_invite_code text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'trip_id', t.id,
    'name', t.name,
    'base_currency', t.base_currency,
    'status', t.status,
    'already_member', exists (
      select 1 from public.trip_members where trip_id = t.id and user_id = auth.uid()
    ),
    'members', coalesce((
      select json_agg(json_build_object(
        'id', m.id,
        'display_name', m.display_name,
        'claimed', m.user_id is not null
      ) order by m.created_at)
      from public.trip_members m where m.trip_id = t.id
    ), '[]'::json)
  )
  from public.trips t
  where t.invite_code = p_invite_code and auth.uid() is not null;
$$;

-- Join through an invite code, either by claiming a placeholder name someone
-- already added for you, or as a brand new member.
create or replace function public.join_trip(
  p_invite_code text,
  p_member_id uuid default null,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_trip_id from public.trips where invite_code = p_invite_code;
  if v_trip_id is null then
    raise exception 'invite link is invalid or has expired';
  end if;

  if exists (
    select 1 from public.trip_members where trip_id = v_trip_id and user_id = auth.uid()
  ) then
    return v_trip_id;
  end if;

  if p_member_id is not null then
    update public.trip_members
       set user_id = auth.uid()
     where id = p_member_id and trip_id = v_trip_id and user_id is null;
    if not found then
      raise exception 'that name has already been claimed';
    end if;
  else
    if p_display_name is null or char_length(btrim(p_display_name)) = 0 then
      raise exception 'a display name is required';
    end if;
    insert into public.trip_members (trip_id, user_id, display_name)
    values (v_trip_id, auth.uid(), btrim(p_display_name));
  end if;

  return v_trip_id;
end;
$$;

revoke execute on function public.create_trip(text, text, text, text, text[]) from anon;
revoke execute on function public.get_trip_invite(text) from anon;
revoke execute on function public.join_trip(text, uuid, text) from anon;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.trip_expenses;
alter publication supabase_realtime add table public.settlement_payments;
alter publication supabase_realtime add table public.trip_members;

-- ---------------------------------------------------------------------------
-- Receipt photos: private bucket, one folder per trip
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.receipt_trip_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f-]{36}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

create policy "receipts_read_members" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_trip_member(public.receipt_trip_id(name)));

create policy "receipts_upload_members" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_trip_member(public.receipt_trip_id(name)));

create policy "receipts_delete_members" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and public.is_trip_member(public.receipt_trip_id(name)));
