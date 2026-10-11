import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbMessage, jsonError, requireUser, zodMessage } from '@/lib/api';
import { getMyTrips } from '@/lib/data';

const createTripSchema = z.object({
  name: z.string().trim().min(1, 'Give the trip a name').max(80),
  base_currency: z.string().regex(/^[A-Z]{3}$/, 'Pick a currency'),
  display_name: z.string().trim().min(1, 'Add your name').max(40),
  paynow_number: z.string().trim().max(20).nullish(),
  other_members: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
});

export async function GET() {
  const { response } = await requireUser();
  if (response) return response;

  const trips = await getMyTrips();
  return NextResponse.json({
    trips: trips.map(({ trip, members }) => ({ ...trip, member_count: members.length })),
  });
}

export async function POST(request: Request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const parsed = createTripSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { name, base_currency, display_name, paynow_number, other_members } = parsed.data;

  const names = [display_name, ...other_members].map((n) => n.toLowerCase());
  if (new Set(names).size !== names.length) {
    return jsonError('Two people have the same name. Add a surname or initial to tell them apart.');
  }

  const { data, error } = await supabase.rpc('create_trip', {
    p_name: name,
    p_base_currency: base_currency,
    p_display_name: display_name,
    p_paynow_number: paynow_number ?? null,
    p_other_members: other_members,
  });

  if (error || !data) return jsonError(dbMessage(error, 'Could not create the trip'), 500);
  return NextResponse.json({ id: data }, { status: 201 });
}
