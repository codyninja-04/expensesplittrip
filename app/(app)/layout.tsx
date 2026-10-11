import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { getUser } from '@/lib/data';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'You';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <Header name={name} avatarUrl={avatarUrl} />
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-6">{children}</main>
    </>
  );
}
