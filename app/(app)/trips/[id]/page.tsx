import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { InviteButton } from '@/components/trips/InviteButton';
import { TripLive } from '@/components/trips/TripLive';
import { getTripBundle } from '@/lib/data';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const bundle = await getTripBundle(params.id);
  return { title: bundle?.trip.name ?? 'Trip' };
}

export default async function TripPage({ params }: { params: { id: string } }) {
  const bundle = await getTripBundle(params.id);
  if (!bundle) notFound();

  const { trip, members, expenses, payments, me } = bundle;

  return (
    <div className="animate-fade-in">
      <Link href="/trips" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Trips
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{trip.name}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Settling in {trip.base_currency}
            {trip.status === 'settled' && ' · Settled and closed'}
          </p>
        </div>
        {trip.status === 'active' && <InviteButton inviteCode={trip.invite_code} tripName={trip.name} />}
      </div>

      <TripLive
        trip={trip}
        initialMembers={members}
        initialExpenses={expenses}
        initialPayments={payments}
        meId={me.id}
      />
    </div>
  );
}
