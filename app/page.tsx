import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Camera, Globe2, Zap } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { getUser } from '@/lib/data';

const FEATURES = [
  {
    icon: Camera,
    title: 'Snap any receipt',
    body: 'Japanese izakaya bill, Thai 7-Eleven slip, a Bali villa invoice. It reads the total and the currency for you.',
  },
  {
    icon: Globe2,
    title: 'Every currency, one balance',
    body: 'Pay in yen, baht or rupiah. Everything converts to your home currency so the numbers actually mean something.',
  },
  {
    icon: Zap,
    title: 'Fewest transfers to settle',
    body: 'Not everyone paying everyone. Debts get netted so four friends usually settle in two or three PayNow transfers.',
  },
];

export default async function LandingPage() {
  const user = await getUser();
  if (user) redirect('/trips');

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Logo />
        <Link href="/login" className="btn-ghost text-sm">
          Log in
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-16 pt-14 text-center md:pt-24">
        <p className="mx-auto mb-5 inline-flex rounded-full bg-primary-50 px-3 py-1 text-[13px] font-medium text-primary-700">
          Built for friend group trips
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Who paid for what, sorted before you land.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-[17px] leading-relaxed text-ink-muted">
          Log expenses on the go in any currency, see everyone&apos;s balance update live, and settle
          up at the end with the minimum number of transfers.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary px-6 py-3 shadow-lift">
            Start a trip <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-sm text-ink-faint">Free. Your friends don&apos;t need the app.</span>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-24 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
