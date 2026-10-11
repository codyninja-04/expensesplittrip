import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbMessage, jsonError, requireUser, zodMessage } from '@/lib/api';
import { getTripBundle } from '@/lib/data';

const updateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    status: z.enum(['active', 'settled']).optional(),
  })
  .refine((v) => v.name !== undefined || v.status !== undefined, 'Nothing to update');

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const bundle = await getTripBundle(params.id);
  if (!bundle) return jsonError('Trip not found', 404);
  return NextResponse.json(bundle);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const parsed = updateTripSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { data, error } = await supabase
    .from('trips')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (error) return jsonError(dbMessage(error, 'Could not update the trip'), 500);
  if (!data) return jsonError('Trip not found', 404);
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  // RLS only lets the creator delete, so a zero row result means "not yours".
  const { data, error } = await supabase.from('trips').delete().eq('id', params.id).select('id');
  if (error) return jsonError(dbMessage(error, 'Could not delete the trip'), 500);
  if (!data || data.length === 0) return jsonError('Only the person who created the trip can delete it', 403);
  return NextResponse.json({ ok: true });
}
