import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbMessage, jsonError, requireUser, zodMessage } from '@/lib/api';
import { getTripBundle, isUuid } from '@/lib/data';
import { buildSettlementPlan } from '@/lib/settlement/plan';

const paymentSchema = z.object({
  from_member: z.string().uuid(),
  to_member: z.string().uuid(),
  amount: z.coerce.number().positive().max(1e12),
});

/** The optimal set of transfers that settles everyone, given what's been paid so far. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { response } = await requireUser();
  if (response) return response;

  const bundle = await getTripBundle(params.id);
  if (!bundle) return jsonError('Trip not found', 404);

  const plan = buildSettlementPlan(bundle);
  const names = new Map(bundle.members.map((m) => [m.id, m.display_name]));

  return NextResponse.json({
    ...plan,
    transfers: plan.transfers.map((t) => ({
      ...t,
      from_name: names.get(t.from),
      to_name: names.get(t.to),
    })),
  });
}

/** Mark a transfer as paid. It feeds back into balances, shrinking the plan. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;

  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  if (parsed.data.from_member === parsed.data.to_member) return jsonError('Pick two different people');

  const { data, error } = await supabase
    .from('settlement_payments')
    .insert({ trip_id: params.id, recorded_by: user.id, ...parsed.data })
    .select()
    .single();

  if (error) return jsonError(dbMessage(error, 'Could not record that payment'), 500);
  return NextResponse.json({ ...data, amount: Number(data.amount) }, { status: 201 });
}

/** Undo a payment marked by mistake. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;

  const paymentId = new URL(request.url).searchParams.get('payment_id') ?? '';
  if (!isUuid(paymentId)) return jsonError('payment_id is required');

  const { data, error } = await supabase
    .from('settlement_payments')
    .delete()
    .eq('id', paymentId)
    .eq('trip_id', params.id)
    .select('id');

  if (error) return jsonError(dbMessage(error, 'Could not undo that payment'), 500);
  if (!data || data.length === 0) return jsonError('Payment not found or the trip is closed', 404);
  return NextResponse.json({ ok: true });
}
