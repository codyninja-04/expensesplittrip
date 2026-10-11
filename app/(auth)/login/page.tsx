import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleSignIn } from '@/components/auth/GoogleSignIn';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const signupHref = searchParams.next
    ? `/signup?next=${encodeURIComponent(searchParams.next)}`
    : '/signup';

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where your group left off. Every expense is right where you logged it."
      footer={
        <>
          New here?{' '}
          <Link href={signupHref} className="font-semibold text-primary-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense>
        <GoogleSignIn label="Continue with Google" />
      </Suspense>
    </AuthShell>
  );
}
