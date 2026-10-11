import type { Metadata } from 'next';
import { NewTripForm } from '@/components/trips/NewTripForm';
import { getUser } from '@/lib/data';

export const metadata: Metadata = { title: 'New trip' };

export default async function NewTripPage() {
  const user = await getUser();
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? '';
  // First name is what friends actually call each other in a split list.
  const defaultName = fullName.split(' ')[0] ?? '';

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">New trip</h1>
      <p className="mt-0.5 text-sm text-ink-muted">
        Takes ten seconds. You can add more people later.
      </p>
      <NewTripForm defaultName={defaultName} />
    </div>
  );
}
