import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Google OAuth lands here. Swap the code for a session, then continue to
// wherever the user was heading (an invite link, usually) or their trips.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/trips';

  // Only allow same-site relative paths so this can't become an open redirect.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/trips';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Sign in did not complete, please try again')}`
  );
}
