'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Camera, Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import { CATEGORY_META } from '@/lib/categories';
import { formatMoney, formatRate } from '@/lib/currency/currencies';
import { cn } from '@/lib/format';
import { compressImage } from '@/lib/image';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, type Category, type TripMember } from '@/lib/types';

const currencyKey = (tripId: string) => `tripsplit:currency:${tripId}`;

function readStoredCurrency(tripId: string): string | null {
  try {
    return window.localStorage.getItem(currencyKey(tripId));
  } catch {
    return null;
  }
}

function storeCurrency(tripId: string, code: string) {
  try {
    window.localStorage.setItem(currencyKey(tripId), code);
  } catch {
    // Private mode or storage blocked. Not worth surfacing.
  }
}

export function AddExpenseForm({
  tripId,
  baseCurrency,
  members,
  meId,
  autoScan,
}: {
  tripId: string;
  baseCurrency: string;
  members: TripMember[];
  meId: string;
  autoScan: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [category, setCategory] = useState<Category>('food');
  const [paidBy, setPaidBy] = useState(meId);
  const [splitAmong, setSplitAmong] = useState<string[]>(members.map((m) => m.id));

  const [rate, setRate] = useState<number | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [rateManual, setRateManual] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On a trip abroad nearly everything is in one foreign currency, so remember
  // the last one used for this trip.
  useEffect(() => {
    const stored = readStoredCurrency(tripId);
    if (stored) setCurrency(stored);
  }, [tripId]);

  useEffect(() => {
    if (autoScan) fileRef.current?.click();
  }, [autoScan]);

  // Fetch a live rate whenever the currency changes, unless the user typed one.
  useEffect(() => {
    if (currency === baseCurrency) {
      setRate(1);
      setRateError(null);
      return;
    }
    if (rateManual) return;

    const controller = new AbortController();
    setRateLoading(true);
    setRateError(null);
    fetch(`/api/rates?from=${currency}&to=${baseCurrency}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRate(data.rate);
        setRateInput(formatRate(data.rate));
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setRate(null);
        setRateError('No live rate right now. Type the rate in below.');
      })
      .finally(() => setRateLoading(false));

    return () => controller.abort();
  }, [currency, baseCurrency, rateManual]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setScanNote(null);
    setScanning(true);

    try {
      const image = await compressImage(file);
      setPreview(image.previewUrl);

      const supabase = createClient();
      const path = `${tripId}/${crypto.randomUUID()}.jpg`;

      // Upload the photo and read it at the same time. A failed upload
      // shouldn't block the scan, the photo is a nice to have.
      const [scanRes] = await Promise.all([
        fetch('/api/expenses/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: tripId, image: image.base64, mime_type: image.mimeType }),
        }),
        supabase.storage
          .from('receipts')
          .upload(path, image.blob, { contentType: 'image/jpeg' })
          .then(({ error }) => {
            if (!error) setPhotoPath(path);
          }),
      ]);

      const data = await scanRes.json();
      if (!scanRes.ok) {
        setScanNote({ tone: 'warn', text: data.error ?? "Couldn't read that one. Fill it in below." });
        return;
      }

      setDescription(data.description);
      setAmount(String(data.amount));
      if (data.currency) {
        setRateManual(false);
        setCurrency(data.currency);
      }
      setCategory(data.category);
      setScanNote(
        data.confidence === 'low'
          ? { tone: 'warn', text: 'Filled in, but the photo was hard to read. Double check the amount.' }
          : { tone: 'ok', text: 'Filled in from your receipt. Give it a quick look.' }
      );
    } catch (err) {
      setScanNote({ tone: 'warn', text: (err as Error).message || 'Something went wrong reading that photo' });
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function clearPhoto() {
    if (photoPath) createClient().storage.from('receipts').remove([photoPath]);
    setPhotoPath(null);
    setPreview(null);
    setScanNote(null);
  }

  function toggleSplit(id: string) {
    setSplitAmong((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  const everyone = splitAmong.length === members.length;
  const amountNum = Number(amount);
  const effectiveRate = currency === baseCurrency ? 1 : rate;
  const converted = amountNum > 0 && effectiveRate ? amountNum * effectiveRate : null;
  const perPerson = converted && splitAmong.length > 0 ? converted / splitAmong.length : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: tripId,
        description,
        amount_original: amountNum,
        currency_original: currency,
        exchange_rate: currency === baseCurrency ? null : rateManual ? rate : null,
        category,
        paid_by: paidBy,
        split_among: splitAmong,
        photo_url: photoPath,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not save');
      setSaving(false);
      return;
    }
    storeCurrency(tripId, currency);
    router.push(`/trips/${tripId}`);
    router.refresh();
  }

  const canSubmit =
    description.trim() && amountNum > 0 && splitAmong.length > 0 && (currency === baseCurrency || rate) && !scanning;

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Receipt scanner */}
      {preview ? (
        <div className="card flex items-center gap-3 p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Receipt" className="h-full w-full object-cover" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-[13px]">
            {scanning ? (
              <p className="flex items-center gap-1.5 font-medium text-primary-700">
                <Sparkles className="h-3.5 w-3.5" /> Reading your receipt
              </p>
            ) : scanNote ? (
              <p
                className={cn(
                  'flex items-start gap-1.5',
                  scanNote.tone === 'ok' ? 'text-owed' : 'text-amber-700'
                )}
              >
                {scanNote.tone === 'ok' ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {scanNote.text}
              </p>
            ) : null}
            {!scanning && (
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-primary-600 hover:underline">
                Retake
              </button>
            )}
          </div>
          {!scanning && (
            <button type="button" onClick={clearPhoto} className="btn-ghost p-2" aria-label="Remove photo">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary-50/60 p-4 text-left transition hover:border-primary/60 hover:bg-primary-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lift transition group-hover:scale-105">
            <Camera className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">Scan a receipt</span>
            <span className="block text-[13px] text-ink-muted">
              Any language, any currency. We fill in the rest.
            </span>
          </span>
        </button>
      )}

      {/* Amount */}
      <div className="card space-y-4 p-5">
        <div>
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input tabular flex-1 text-2xl font-semibold"
              required
            />
            <CurrencySelect
              value={currency}
              onChange={(c) => {
                setRateManual(false);
                setCurrency(c);
              }}
              className="w-32"
              compact
            />
          </div>
        </div>

        {currency !== baseCurrency && (
          <div className="rounded-xl bg-background p-3 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-ink-muted">1 {currency} =</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={rateInput}
                onChange={(e) => {
                  setRateInput(e.target.value);
                  const n = Number(e.target.value);
                  setRate(n > 0 ? n : null);
                  setRateManual(true);
                }}
                className="input tabular w-28 px-2.5 py-1.5 text-[13px]"
                aria-label="Exchange rate"
              />
              <span className="text-ink-muted">{baseCurrency}</span>
              {rateLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />}
              {rateManual && (
                <button
                  type="button"
                  onClick={() => setRateManual(false)}
                  className="ml-auto flex items-center gap-1 text-primary-600 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Live rate
                </button>
              )}
            </div>
            {rateError ? (
              <p className="mt-2 text-amber-700">{rateError}</p>
            ) : (
              <p className="mt-2 text-ink-faint">
                {rateManual
                  ? 'Using your rate. Handy if your card charged something different.'
                  : 'Live mid-market rate. Tap the number to use your card rate instead.'}
              </p>
            )}
            {converted !== null && (
              <p className="tabular mt-2 text-[15px] font-semibold text-ink">
                ≈ {formatMoney(converted, baseCurrency)}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="description" className="label">
            What was it for
          </label>
          <input
            id="description"
            className="input"
            placeholder="Dinner at Ichiran"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c];
              const Icon = meta.icon;
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'chip',
                    active ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink-muted hover:border-slate-300'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Who */}
      <div className="card space-y-5 p-5">
        <div>
          <span className="label">Paid by</span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidBy(m.id)}
                className={cn(
                  'chip py-1 pl-1',
                  paidBy === m.id ? 'border-primary bg-primary-50 text-primary-700' : 'border-line bg-surface text-ink'
                )}
              >
                <Avatar name={m.display_name} seed={m.id} size="xs" />
                {m.id === meId ? 'You' : m.display_name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-muted">Split between</span>
            <button
              type="button"
              onClick={() => setSplitAmong(everyone ? [paidBy] : members.map((m) => m.id))}
              className="text-[13px] font-medium text-primary-600 hover:underline"
            >
              {everyone ? 'Just the payer' : 'Everyone'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = splitAmong.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleSplit(m.id)}
                  aria-pressed={on}
                  className={cn(
                    'chip py-1 pl-1',
                    on ? 'border-primary bg-primary-50 text-primary-700' : 'border-line bg-surface text-ink-faint line-through decoration-1'
                  )}
                >
                  <Avatar name={m.display_name} seed={m.id} size="xs" className={on ? '' : 'opacity-40'} />
                  {m.id === meId ? 'You' : m.display_name}
                </button>
              );
            })}
          </div>
          {perPerson !== null && (
            <p className="tabular mt-2.5 text-[13px] text-ink-muted">
              {formatMoney(perPerson, baseCurrency)} each across {splitAmong.length}{' '}
              {splitAmong.length === 1 ? 'person' : 'people'}
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-owes">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-background/90 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4">
          <button type="submit" disabled={!canSubmit || saving} className="btn-primary w-full py-3 shadow-lift">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add expense
            {converted !== null && (
              <span className="tabular font-normal opacity-80">· {formatMoney(converted, baseCurrency)}</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
