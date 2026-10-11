import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function zodMessage(error: ZodError) {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request';
  const field = issue.path.join('.');
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Postgres raises plain messages from our RPCs and triggers. Surface those, hide the rest. */
export function dbMessage(error: { message?: string; code?: string } | null, fallback: string) {
  if (!error) return fallback;
  if (error.code === '23505') return 'Someone in this trip already has that name';
  if (error.code === '23503') return "That person has expenses on this trip, so they can't be removed";
  if (error.code === 'P0001' && error.message) {
    return error.message.charAt(0).toUpperCase() + error.message.slice(1);
  }
  return fallback;
}

/** Returns the signed in user plus a cookie bound client, or a 401 response. */
export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, response: jsonError('Please sign in again', 401) } as const;
  return { supabase, user, response: null } as const;
}
