'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { formatMoney } from '@/lib/currency/currencies';
import { cn } from '@/lib/format';
import type { MemberSummary } from '@/lib/settlement/optimize-debts';
import type { TripMember } from '@/lib/types';

export function MemberBalances({
  tripId,
  members,
  summaries,
  currency,
  meId,
  canEdit,
  onMemberAdded,
}: {
  tripId: string;
  members: TripMember[];
  summaries: MemberSummary[];
  currency: string;
  meId: string;
  canEdit: boolean;
  onMemberAdded: (member: TripMember) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(summaries.map((s) => [s.member, s]));
  // You first, then whoever is owed the most down to whoever owes the most.
  const ordered = [...members].sort((a, b) => {
    if (a.id === meId) return -1;
    if (b.id === meId) return 1;
    return (byId.get(b.id)?.balance ?? 0) - (byId.get(a.id)?.balance ?? 0);
  });
  const maxAbs = Math.max(1, ...summaries.map((s) => Math.abs(s.balance)));

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not add them');
      return;
    }
    onMemberAdded(data);
    setName('');
    setAdding(false);
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold">Balances</h2>
        {canEdit && !adding && (
          <button onClick={() => setAdding(true)} className="btn-ghost -mr-2 px-2 py-1 text-[13px]">
            <Plus className="h-3.5 w-3.5" /> Add person
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={addMember} className="flex animate-fade-in gap-2 px-4 pb-3">
          <input
            className="input py-2"
            placeholder="Their name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary px-3 py-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
            className="btn-ghost px-2 py-2"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}
      {error && <p className="px-4 pb-3 text-sm text-owes">{error}</p>}

      <ul className="divide-y divide-line">
        {ordered.map((m) => {
          const s = byId.get(m.id);
          const balance = s?.balance ?? 0;
          const square = Math.abs(balance) < 0.005;
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.display_name} seed={m.id} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-medium">
                  {m.display_name}
                  {m.id === meId && <span className="text-xs font-normal text-ink-faint">(you)</span>}
                  {!m.user_id && (
                    <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-ink-faint">
                      not joined
                    </span>
                  )}
                </p>
                <p className="tabular text-xs text-ink-muted">
                  Paid {formatMoney(s?.paid ?? 0, currency)} · Share {formatMoney(s?.share ?? 0, currency)}
                </p>
              </div>
              <div className="w-28 text-right">
                <p
                  className={cn(
                    'tabular text-[15px] font-semibold',
                    square ? 'text-ink-faint' : balance > 0 ? 'text-owed' : 'text-owes'
                  )}
                >
                  {square ? 'Square' : formatMoney(balance, currency, { signed: true })}
                </p>
                {!square && (
                  <div className="ml-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', balance > 0 ? 'ml-auto bg-owed' : 'bg-owes')}
                      style={{ width: `${Math.max(6, (Math.abs(balance) / maxAbs) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
