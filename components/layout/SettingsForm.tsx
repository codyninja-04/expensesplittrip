'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SettingsForm({
  email,
  name,
  initialPaynow,
  tripCount,
}: {
  email: string;
  name: string;
  initialPaynow: string;
  tripCount: number;
}) {
  const router = useRouter();
  const [paynow, setPaynow] = useState(initialPaynow);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function savePaynow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const value = paynow.trim();
    if (value && !/^\+?[\d\s-]{8,15}$/.test(value)) {
      setError("That doesn't look like a phone number");
      setSaving(false);
      return;
    }

    // Applies to every trip you're in. RLS only lets this touch your own rows.
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('trip_members')
      .update({ paynow_number: value || null })
      .eq('user_id', user?.id ?? '');

    setSaving(false);
    if (error) {
      setError('Could not save. Try again in a moment.');
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <p className="text-xs font-medium text-ink-muted">Signed in as</p>
        {name && <p className="mt-1 font-semibold">{name}</p>}
        <p className="text-[15px] text-ink-muted">{email}</p>
      </section>

      <form onSubmit={savePaynow} className="card space-y-3 p-5">
        <div>
          <label htmlFor="paynow" className="label">
            PayNow number
          </label>
          <input
            id="paynow"
            className="input tabular"
            inputMode="tel"
            placeholder="9123 4567"
            value={paynow}
            onChange={(e) => {
              setPaynow(e.target.value);
              setSaved(false);
            }}
            maxLength={20}
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            Friends who owe you see this with a QR code on the settle up page. Updates it on{' '}
            {tripCount === 1 ? 'your trip' : `all ${tripCount} of your trips`}.
          </p>
        </div>
        {error && <p className="text-sm text-owes">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </form>

      <button onClick={signOut} disabled={signingOut} className="btn-secondary w-full">
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out
      </button>
    </div>
  );
}
