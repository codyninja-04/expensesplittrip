'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/format';
import type { TripInvite } from '@/lib/types';

export function JoinTripForm({
  invite,
  inviteCode,
  suggestedName,
}: {
  invite: TripInvite;
  inviteCode: string;
  suggestedName: string;
}) {
  const router = useRouter();
  const unclaimed = invite.members.filter((m) => !m.claimed);
  const [selected, setSelected] = useState<string | 'new' | null>(
    // If someone already added you by your first name, preselect it.
    unclaimed.find((m) => m.display_name.toLowerCase() === suggestedName.toLowerCase())?.id ??
      (unclaimed.length === 0 ? 'new' : null)
  );
  const [newName, setNewName] = useState(suggestedName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/trips/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invite_code: inviteCode,
        member_id: selected !== 'new' ? selected : null,
        display_name: selected === 'new' ? newName : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not join');
      setSaving(false);
      router.refresh();
      return;
    }
    router.push(`/trips/${data.trip_id}`);
    router.refresh();
  }

  return (
    <div className="animate-fade-in">
      <p className="text-sm font-medium text-primary-600">You&apos;re invited to</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{invite.name}</h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        {invite.members.length} {invite.members.length === 1 ? 'person' : 'people'} so far, settling
        in {invite.base_currency}.
      </p>

      <div className="card mt-8 p-5">
        <h2 className="text-sm font-semibold">Which one are you?</h2>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          If a friend already added you, pick your name so you keep everything already logged.
        </p>

        <div className="mt-4 space-y-2">
          {invite.members.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={m.claimed}
              onClick={() => setSelected(m.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                m.claimed && 'cursor-not-allowed opacity-50',
                selected === m.id
                  ? 'border-primary bg-primary-50 ring-4 ring-primary/10'
                  : 'border-line hover:border-slate-300'
              )}
            >
              <Avatar name={m.display_name} seed={m.id} size="sm" />
              <span className="flex-1 text-[15px] font-medium">{m.display_name}</span>
              {m.claimed ? (
                <span className="text-xs text-ink-faint">Joined</span>
              ) : (
                selected === m.id && <Check className="h-4 w-4 text-primary-600" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelected('new')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition',
              selected === 'new' ? 'border-primary bg-primary-50' : 'border-line hover:border-slate-300'
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm text-ink-muted">
              +
            </span>
            <span className="text-[15px] font-medium">I&apos;m not on the list</span>
          </button>

          {selected === 'new' && (
            <input
              className="input mt-2 animate-fade-in"
              placeholder="Your name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-owes">{error}</p>}

      <button
        onClick={join}
        disabled={saving || !selected || (selected === 'new' && !newName.trim())}
        className="btn-primary mt-6 w-full py-3"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Join trip
      </button>
    </div>
  );
}
