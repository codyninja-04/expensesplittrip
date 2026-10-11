import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleSignIn } from '@/components/auth/GoogleSignIn';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const loginHref = searchParams.next
    ? `/login?next=${encodeURIComponent(searchParams.next)}`
    : '/login';

  return (
    <AuthShell
      title="Split the trip, not the friendship"
      subtitle="Log expenses in any currency, snap receipts, and settle up at the end in the fewest transfers possible. Free for every trip."
      footer={
        <>
          Already have an account?{' '}
          <Link href={loginHref} className="font-semibold text-primary-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Suspense>
        <GoogleSignIn label="Sign up with Google" />
      </Suspense>
      <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
        Your friends don&apos;t need an account to be part of a trip. Add them by name and they can
        join later if they want.
      </p>
    </AuthShell>
  );
}
