import Link from 'next/link';

export default function TripNotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-sm p-6 text-center">
      <h1 className="text-lg font-semibold">Trip not found</h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        Either it was deleted or you&apos;re not part of it yet. Ask a friend in the trip for the
        invite link.
      </p>
      <Link href="/trips" className="btn-secondary mt-5">
        Back to my trips
      </Link>
    </div>
  );
}
