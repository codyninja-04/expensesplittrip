import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { AddExpenseForm } from '@/components/trips/AddExpenseForm';
import { getTripBundle } from '@/lib/data';

export const metadata: Metadata = { title: 'Add expense' };

export default async function AddExpensePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { scan?: string };
}) {
  const bundle = await getTripBundle(params.id);
  if (!bundle) notFound();
  if (bundle.trip.status !== 'active') redirect(`/trips/${params.id}`);

  return (
    <div className="animate-fade-in">
      <Link
        href={`/trips/${params.id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> {bundle.trip.name}
      </Link>
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Add expense</h1>
      <AddExpenseForm
        tripId={bundle.trip.id}
        baseCurrency={bundle.trip.base_currency}
        members={bundle.members}
        meId={bundle.me.id}
        autoScan={searchParams.scan === '1'}
      />
    </div>
  );
}
