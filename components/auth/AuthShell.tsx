import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

// Split layout: the form on one side, a small preview of what settling up
// actually looks like on the other. On phones the preview drops below.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2 md:gap-16">
      <div className="mx-auto w-full max-w-sm animate-fade-in">
        <Link href="/" className="mb-10 inline-flex">
          <Logo />
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
      </div>

      <div className="mx-auto w-full max-w-sm" aria-hidden>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Bali, 4 people
          </p>
          <p className="mt-1 text-lg font-semibold">2 transfers settle everyone up</p>
          <p className="text-sm text-ink-muted">instead of 6</p>
          <div className="mt-4 space-y-2">
            {[
              ['Wei Ming', 'Sarah', 'S$47.50'],
              ['Dan', 'Priya', 'S$112.20'],
            ].map(([from, to, amount]) => (
              <div
                key={from}
                className="flex items-center justify-between rounded-xl bg-background px-3.5 py-3"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{from}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
                  <span className="font-medium">{to}</span>
                </span>
                <span className="tabular text-sm font-semibold">{amount}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {['¥4,800 ramen', '฿1,250 boat', 'Rp 640k villa'].map((tag) => (
              <span key={tag} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
