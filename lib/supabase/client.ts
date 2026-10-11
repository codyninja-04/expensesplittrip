'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Browser-side Supabase client. Safe to call from client components and hooks.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
