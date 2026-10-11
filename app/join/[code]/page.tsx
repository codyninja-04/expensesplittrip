import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Logo } from '@/components/layout/Logo';
import { JoinTripForm } from '@/components/trips/JoinTripForm';
import { getUser } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { TripInvite } from '@/lib/types';

export const metadata: Metadata = { title: 'Join trip' };

export default async function JoinPage({ params }: { params: { code: string } }) {
  const user = await getUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/join/${params.code}`)}`);

  const supabase = createClient();
  const { data } = await supabase.rpc('get_trip_invite', { p_invite_code: params.code });
  const invite = data as TripInvite | null;

  if (invite?.already_member) redirect(`/trips/${invite.trip_id}`);

  const suggested = ((user.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0] ?? '';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/" className="mb-10 inline-flex">
        <Logo />
      </Link>

      {!invite ? (
        <div className="card p-6 text-center">
          <h1 className="text-lg font-semibold">This invite link doesn&apos;t work</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            It might have a typo, or the trip was deleted. Ask whoever sent it for a fresh link.
          </p>
          <Link href="/trips" className="btn-secondary mt-5">
            Go to my trips
          </Link>
        </div>
      ) : (
        <JoinTripForm invite={invite} inviteCode={params.code} suggestedName={suggested} />
      )}
    </main>
  );
}
