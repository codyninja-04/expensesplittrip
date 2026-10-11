'use client';

import { useState } from 'react';
import { Check, UserPlus } from 'lucide-react';

export function InviteButton({ inviteCode, tripName }: { inviteCode: string; tripName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/join/${inviteCode}`;
    const text = `Join "${tripName}" on TripSplit so we can track who paid for what`;

    // Native share sheet on phones (WhatsApp, Telegram), clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text, url });
        return;
      } catch {
        // Cancelled or blocked, fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link', url);
    }
  }

  return (
    <button onClick={share} className="btn-secondary px-3 py-2 text-sm">
      {copied ? <Check className="h-4 w-4 text-owed" /> : <UserPlus className="h-4 w-4" />}
      {copied ? 'Link copied' : 'Invite'}
    </button>
  );
}
