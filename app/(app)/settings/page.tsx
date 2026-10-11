import type { Metadata } from 'next';
import { SettingsForm } from '@/components/layout/SettingsForm';
import { getUser } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await getUser();
  const supabase = createClient();
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('paynow_number, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const paynow = memberships?.find((m) => m.paynow_number)?.paynow_number ?? '';

  return (
    <div className="animate-fade-in">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Settings</h1>
      <SettingsForm
        email={user!.email ?? ''}
        name={(user!.user_metadata?.full_name as string | undefined) ?? ''}
        initialPaynow={paynow}
        tripCount={memberships?.length ?? 0}
      />
    </div>
  );
}
