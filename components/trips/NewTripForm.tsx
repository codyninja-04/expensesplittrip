'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { Avatar } from '@/components/ui/Avatar';

export function NewTripForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SGD');
  const [displayName, setDisplayName] = useState(defaultName);
  const [paynow, setPaynow] = useState('');
  const [friends, setFriends] = useState<string[]>([]);
  const [friendDraft, setFriendDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFriend() {
    const value = friendDraft.trim();
    if (!value) return;
    const taken = [displayName, ...friends].some((n) => n.trim().toLowerCase() === value.toLowerCase());
    if (taken) {
      setError(`${value} is already on the list`);
      return;
    }
    setFriends((f) => [...f, value]);
    setFriendDraft('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Catch a name typed but not yet added, people do this constantly.
    const pending = friendDraft.trim();
    const allFriends = pending ? [...friends, pending] : friends;

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        base_currency: currency,
        display_name: displayName,
        paynow_number: paynow || null,
        other_members: allFriends,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not create the trip');
      setSaving(false);
      return;
    }
    router.push(`/trips/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="card space-y-4 p-5">
        <div>
          <label htmlFor="name" className="label">
            Trip name
          </label>
          <input
            id="name"
            className="input text-base font-medium"
            placeholder="Tokyo, Dec 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="currency" className="label">
            Settle up in
          </label>
          <CurrencySelect id="currency" value={currency} onChange={setCurrency} />
          <p className="mt-1.5 text-xs text-ink-faint">
            Usually your home currency. Expenses in yen, baht or anything else get converted to this.
          </p>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold">Who&apos;s going</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="display_name" className="label">
              Your name in this trip
            </label>
            <input
              id="display_name"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              required
            />
          </div>
          <div>
            <label htmlFor="paynow" className="label">
              Your PayNow number <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="paynow"
              className="input"
              inputMode="tel"
              placeholder="9123 4567"
              value={paynow}
              onChange={(e) => setPaynow(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>

        <div>
          <label htmlFor="friend" className="label">
            Friends
          </label>
          <div className="flex gap-2">
            <input
              id="friend"
              className="input"
              placeholder="Add a name and press enter"
              value={friendDraft}
              onChange={(e) => setFriendDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFriend();
                }
              }}
              maxLength={40}
            />
            <button type="button" onClick={addFriend} className="btn-secondary px-3" aria-label="Add friend">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {friends.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {friends.map((f) => (
                <li
                  key={f}
                  className="flex animate-fade-in items-center gap-1.5 rounded-full border border-line bg-background py-1 pl-1 pr-2 text-sm"
                >
                  <Avatar name={f} size="xs" />
                  {f}
                  <button
                    type="button"
                    onClick={() => setFriends((list) => list.filter((x) => x !== f))}
                    className="ml-0.5 rounded-full p-0.5 text-ink-faint hover:bg-slate-200 hover:text-ink"
                    aria-label={`Remove ${f}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-faint">
            They don&apos;t need an account. When they open the invite link they can claim their name.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-owes">{error}</p>}

      <button type="submit" disabled={saving || !name.trim() || !displayName.trim()} className="btn-primary w-full py-3">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Create trip
      </button>
    </form>
  );
}
