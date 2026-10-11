'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, Check, Copy, Loader2, QrCode } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { formatMoney } from '@/lib/currency/currencies';
import { cn } from '@/lib/format';
import { buildPayNowQRString } from '@/lib/paynow/generate-qr';
import type { TripMember } from '@/lib/types';

export function TransactionCard({
  from,
  to,
  amount,
  currency,
  tripName,
  meId,
  canMark,
  onMarkPaid,
}: {
  from: TripMember;
  to: TripMember;
  amount: number;
  currency: string;
  tripName: string;
  meId: string;
  canMark: boolean;
  onMarkPaid: () => Promise<void>;
}) {
  const [marking, setMarking] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const youPay = from.id === meId;
  const youReceive = to.id === meId;
  // PayNow only moves SGD, so the QR only makes sense for SGD trips.
  const payNowReady = currency === 'SGD' && Boolean(to.paynow_number);

  useEffect(() => {
    if (!showQr || !payNowReady || qr) return;
    const payload = buildPayNowQRString({
      recipientType: 'phone',
      recipientValue: to.paynow_number!,
      amount,
      reference: `TripSplit ${tripName}`.slice(0, 25),
      amountEditable: false,
    });
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: '#7C1A78' } }).then(setQr);
  }, [showQr, payNowReady, qr, to.paynow_number, amount, tripName]);

  async function copyDetails() {
    const lines = [
      `${tripName}: ${from.display_name} pays ${to.display_name} ${formatMoney(amount, currency)}`,
      to.paynow_number ? `PayNow: ${to.paynow_number}` : null,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy these details', lines.join('\n'));
    }
  }

  async function mark() {
    setMarking(true);
    await onMarkPaid();
    setMarking(false);
  }

  return (
    <li className={cn('card animate-fade-in overflow-hidden', (youPay || youReceive) && 'ring-2 ring-primary/15')}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar name={from.display_name} seed={from.id} />
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" />
          <Avatar name={to.display_name} seed={to.id} />
          <p className="ml-1 min-w-0 truncate text-[15px] leading-snug">
            <span className="font-semibold">{youPay ? 'You' : from.display_name}</span>
            <span className="text-ink-muted"> {youPay ? 'pay' : 'pays'} </span>
            <span className="font-semibold">{youReceive ? 'you' : to.display_name}</span>
          </p>
        </div>
        <p className={cn('tabular text-lg font-bold', youPay ? 'text-owes' : youReceive ? 'text-owed' : 'text-ink')}>
          {formatMoney(amount, currency)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-background/50 px-4 py-2.5">
        {to.paynow_number ? (
          <span className="text-[13px] text-ink-muted">
            PayNow <span className="tabular font-medium text-ink">{to.paynow_number}</span>
          </span>
        ) : (
          <span className="text-[13px] text-ink-faint">No PayNow number added</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {payNowReady && (
            <button
              onClick={() => setShowQr((s) => !s)}
              className={cn('btn-ghost px-2.5 py-1.5 text-[13px]', showQr && 'bg-slate-100 text-ink')}
            >
              <QrCode className="h-3.5 w-3.5" /> QR
            </button>
          )}
          <button onClick={copyDetails} className="btn-ghost px-2.5 py-1.5 text-[13px]">
            {copied ? <Check className="h-3.5 w-3.5 text-owed" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {canMark && (
            <button onClick={mark} disabled={marking} className="btn-primary px-3 py-1.5 text-[13px]">
              {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Mark as paid
            </button>
          )}
        </div>
      </div>

      {showQr && (
        <div className="flex animate-fade-in flex-col items-center gap-2 border-t border-line px-4 py-5">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`PayNow QR for ${to.display_name}`} className="h-48 w-48 rounded-xl" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
            </div>
          )}
          <p className="text-center text-xs text-ink-muted">
            Scan with any Singapore banking app. Amount is filled in for you.
          </p>
        </div>
      )}
    </li>
  );
}
