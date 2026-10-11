import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbMessage, jsonError, requireUser, zodMessage } from '@/lib/api';

const joinSchema = z
  .object({
    invite_code: z.string().trim().min(4).max(64),
    member_id: z.string().uuid().nullish(),
    display_name: z.string().trim().min(1).max(40).nullish(),
  })
  .refine((v) => v.member_id || v.display_name, 'Pick your name or add a new one');

export async function POST(request: Request) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const parsed = joinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { data, error } = await supabase.rpc('join_trip', {
    p_invite_code: parsed.data.invite_code,
    p_member_id: parsed.data.member_id ?? null,
    p_display_name: parsed.data.display_name ?? null,
  });

  if (error || !data) {
    const status = error?.code === '23505' ? 409 : 400;
    return jsonError(dbMessage(error, 'Could not join this trip'), status);
  }
  return NextResponse.json({ trip_id: data });
}
