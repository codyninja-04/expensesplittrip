'use client';

import { useState } from 'react';
import { ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { AvatarStack } from '@/components/ui/Avatar';
import { categoryMeta } from '@/lib/categories';
import { formatMoney, formatRate } from '@/lib/currency/currencies';
import { cn, dayLabel, timeLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import type { TripExpense, TripMember } from '@/lib/types';

export function ExpenseList({
  expenses,
  members,
  baseCurrency,
  meId,
  canEdit,
  onDeleted,
}: {
  expenses: TripExpense[];
  members: TripMember[];
  baseCurrency: string;
  meId: string;
  canEdit: boolean;
  onDeleted: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));

  if (expenses.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="text-[15px] font-medium">No expenses yet</p>
        <p className="mt-1 text-sm text-ink-muted">
          Snap the first receipt or add one by hand. Everyone in the trip sees it instantly.
        </p>
      </div>
    );
  }

  // Group by calendar day, newest first.
  const groups: Array<{ day: string; items: TripExpense[]; total: number }> = [];
  for (const e of expenses) {
    const day = dayLabel(e.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(e);
      last.total += e.amount_base_currency;
    } else {
      groups.push({ day, items: [e], total: e.amount_base_currency });
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.day}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{group.day}</h3>
            <span className="tabular text-xs text-ink-faint">{formatMoney(group.total, baseCurrency)}</span>
          </div>
          <ul className="card divide-y divide-line overflow-hidden">
            {group.items.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                byId={byId}
                baseCurrency={baseCurrency}
                meId={meId}
                open={openId === expense.id}
                canEdit={canEdit}
                onToggle={() => setOpenId((id) => (id === expense.id ? null : expense.id))}
                onDeleted={onDeleted}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ExpenseRow({
  expense,
  byId,
  baseCurrency,
  meId,
  open,
  canEdit,
  onToggle,
  onDeleted,
}: {
  expense: TripExpense;
  byId: Map<string, TripMember>;
  baseCurrency: string;
  meId: string;
  open: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const meta = categoryMeta(expense.category);
  const Icon = meta.icon;
  const payer = byId.get(expense.paid_by);
  const sharers = expense.split_among
    .map((id) => byId.get(id))
    .filter((m): m is TripMember => Boolean(m));
  const foreign = expense.currency_original !== baseCurrency;
  const myShare = expense.split_among.includes(meId)
    ? expense.amount_base_currency / expense.split_among.length
    : 0;

  async function remove() {
    setDeleting(true);
    const res = await fetch(`/api/expenses?id=${expense.id}`, { method: 'DELETE' });
    if (res.ok) onDeleted(expense.id);
    else setDeleting(false);
  }

  async function viewReceipt() {
    if (!expense.photo_url) return;
    setLoadingPhoto(true);
    const supabase = createClient();
    const { data } = await supabase.storage.from('receipts').createSignedUrl(expense.photo_url, 300);
    setLoadingPhoto(false);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  }

  return (
    <li className="animate-fade-in">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{expense.description}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="truncate">
              {payer?.id === meId ? 'You' : payer?.display_name ?? 'Someone'} paid
            </span>
            <span className="text-ink-faint">·</span>
            <AvatarStack people={sharers} max={3} />
            <span className="whitespace-nowrap">
              {sharers.length === 1 ? sharers[0].display_name : `split ${sharers.length} ways`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="tabular text-[15px] font-semibold">
            {formatMoney(expense.amount_base_currency, baseCurrency)}
          </p>
          {foreign && (
            <p className="tabular text-xs text-ink-faint">
              {formatMoney(expense.amount_original, expense.currency_original)}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="animate-fade-in space-y-3 border-t border-dashed border-line bg-background/60 px-4 py-3 text-[13px]">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {foreign && expense.exchange_rate && (
              <>
                <dt className="text-ink-muted">Rate used</dt>
                <dd className="tabular text-right">
                  1 {expense.currency_original} = {formatRate(expense.exchange_rate)} {baseCurrency}
                </dd>
              </>
            )}
            <dt className="text-ink-muted">Your share</dt>
            <dd className="tabular text-right font-medium">
              {myShare > 0 ? formatMoney(myShare, baseCurrency) : 'Not included'}
            </dd>
            <dt className="text-ink-muted">Split with</dt>
            <dd className="text-right">{sharers.map((m) => m.display_name).join(', ')}</dd>
            <dt className="text-ink-muted">Logged</dt>
            <dd className="text-right">{timeLabel(expense.created_at)}</dd>
          </dl>

          <div className="flex items-center justify-between gap-2 pt-1">
            {expense.photo_url ? (
              <button onClick={viewReceipt} className="btn-ghost -ml-2 px-2 py-1.5 text-[13px]">
                {loadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                View receipt
              </button>
            ) : (
              <span />
            )}
            {canEdit &&
              (confirming ? (
                <span className="flex items-center gap-2">
                  <button onClick={() => setConfirming(false)} className="btn-ghost px-2 py-1.5 text-[13px]">
                    Keep
                  </button>
                  <button
                    onClick={remove}
                    disabled={deleting}
                    className="btn px-3 py-1.5 text-[13px] bg-owes text-white hover:bg-red-700"
                  >
                    {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Delete for everyone
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="btn-ghost -mr-2 px-2 py-1.5 text-[13px] hover:text-owes"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ))}
          </div>
        </div>
      )}
    </li>
  );
}
