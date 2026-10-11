import Link from 'next/link';
import type { Metadata } from 'next';
import { Plane, Plus } from 'lucide-react';
import { TripCard } from '@/components/trips/TripCard';
import { getMyTrips } from '@/lib/data';

export const metadata: Metadata = { title: 'My trips' };

export default async function TripsPage() {
  const trips = await getMyTrips();
  const active = trips.filter((t) => t.trip.status === 'active');
  const settled = trips.filter((t) => t.trip.status === 'settled');

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My trips</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {active.length > 0
              ? `${active.length} on the go`
              : 'Nothing running right now'}
          </p>
        </div>
        <Link href="/trips/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <Plane className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold">No trips yet</h2>
          <p className="mt-1 max-w-xs text-[15px] text-ink-muted">
            Start one, add your friends by name and send them the invite link. They can join
            whenever, even mid-trip.
          </p>
          <Link href="/trips/new" className="btn-primary mt-6">
            <Plus className="h-4 w-4" /> Start your first trip
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section className="space-y-3">
              {active.map((item) => (
                <TripCard key={item.trip.id} item={item} />
              ))}
            </section>
          )}
          {settled.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Past trips
              </h2>
              <div className="space-y-3 opacity-90">
                {settled.map((item) => (
                  <TripCard key={item.trip.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
