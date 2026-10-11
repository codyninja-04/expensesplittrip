import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Logo } from './Logo';
import { avatarColour, initials } from '@/lib/format';

export function Header({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/trips" aria-label="My trips">
          <Logo />
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-ink-muted transition hover:bg-slate-100 hover:text-ink"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${avatarColour(name)}`}
            >
              {initials(name)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
