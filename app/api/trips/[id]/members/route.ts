import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbMessage, jsonError, requireUser, zodMessage } from '@/lib/api';
import { isUuid } from '@/lib/data';

const addMemberSchema = z.object({
  display_name: z.string().trim().min(1, 'Add a name').max(40),
  paynow_number: z.string().trim().max(20).nullish(),
});

const updateMemberSchema = z.object({
  member_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(40).optional(),
  paynow_number: z.string().trim().max(20).nullable().optional(),
});

/** Add a friend who doesn't have an account (yet). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const parsed = addMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { data, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: params.id,
      display_name: parsed.data.display_name,
      paynow_number: parsed.data.paynow_number || null,
    })
    .select()
    .single();

  if (error) return jsonError(dbMessage(error, 'Could not add that person'), error.code === '23505' ? 409 : 500);
  return NextResponse.json(data, { status: 201 });
}

/** Edit a name or PayNow number. RLS limits this to your own row or placeholders. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const parsed = updateMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { member_id, ...changes } = parsed.data;
  if (changes.paynow_number === '') changes.paynow_number = null;

  const { data, error } = await supabase
    .from('trip_members')
    .update(changes)
    .eq('id', member_id)
    .eq('trip_id', params.id)
    .select()
    .maybeSingle();

  if (error) return jsonError(dbMessage(error, 'Could not update that person'), 500);
  if (!data) return jsonError("You can only edit yourself or friends who haven't joined yet", 403);
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const memberId = new URL(request.url).searchParams.get('member_id') ?? '';
  if (!isUuid(memberId)) return jsonError('member_id is required');

  // Being in someone else's split doesn't block the FK, so check it here.
  const { count } = await supabase
    .from('trip_expenses')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', params.id)
    .contains('split_among', [memberId]);
  if (count && count > 0) {
    return jsonError("They're part of an expense already. Remove them from those first.", 409);
  }

  const { data, error } = await supabase
    .from('trip_members')
    .delete()
    .eq('id', memberId)
    .eq('trip_id', params.id)
    .select('id');

  if (error) return jsonError(dbMessage(error, 'Could not remove that person'), 409);
  if (!data || data.length === 0) {
    return jsonError('Only friends who have not joined yet can be removed', 403);
  }
  return NextResponse.json({ ok: true });
}
