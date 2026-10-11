# TripSplit

Group travel expenses for how friend groups actually travel. Someone books the hotel upfront, someone else covers dinners in yen, a third person pays for the boat in baht. TripSplit keeps track of all of it, converts everything into one currency, and at the end tells you the fewest transfers it takes to square everyone up, with PayNow details ready to go.

## What it does

- **Trips with friends who don't need the app.** Add people by name. When they open the invite link they claim their name and keep everything already logged for them.
- **Snap any receipt.** Claude reads the total, currency and category from a photo in any language. Photos are resized on the phone first so it stays quick on roaming data.
- **Any currency.** Pick what you paid in, and it converts to the trip's base currency at the live rate. If your card charged a different rate, type that in instead.
- **Live for everyone.** Expenses and balances update in realtime for the whole group.
- **Fewest transfers to settle.** Debts are netted so a group of four usually settles in two or three transfers instead of six or more. Mark each one as paid as it happens.
- **PayNow ready.** For SGD trips, each transfer comes with a scannable PayNow QR with the amount filled in.

## Stack

- Next.js 14 (App Router, installable PWA), TypeScript strict
- Supabase: Postgres with row level security, Google auth, Realtime, private storage for receipts
- Claude vision for receipt reading
- Tailwind CSS
- Vitest for the settlement engine and receipt parser

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

### Supabase setup

1. Create a project and run `supabase/migrations/001_initial_schema.sql` in the SQL editor (or `supabase db push`).
2. Under Authentication, enable the Google provider and add `http://localhost:3000/auth/callback` plus your production URL to the redirect allow list.
3. That's it. The migration creates the tables, RLS policies, RPCs, realtime publication and the private `receipts` bucket.

### Environment

| Variable | What it's for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Reserved for background jobs. Request handlers never use it |
| `ANTHROPIC_API_KEY` | Receipt scanning |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-sonnet-4-6` |
| `EXCHANGE_RATE_API_KEY` | Optional. Without it, rates come from the free open.er-api.com feed |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL |

## How settling works

All money maths runs in integer minor units (cents, or whole yen for JPY), so a S$100 bill split three ways is 33.34 + 33.33 + 33.33 and the trip's balances always add up to exactly zero.

The plan is built in two passes (`lib/settlement/optimize-debts.ts`):

1. Pair off anyone whose debt exactly matches someone else's credit. One transfer settles two people.
2. Match the largest remaining debtor with the largest creditor until everyone is at zero.

Payments marked as paid are fed back into the balances, so the plan shrinks as people pay. Run `npm test` to see the cases it covers.

## Data model notes

- Members are rows in `trip_members`, not auth users, so placeholder friends work. Expenses point at member ids rather than names, so renaming someone never breaks history.
- Every table is locked down with RLS through an `is_trip_member()` helper. Trip creation and joining go through `security definer` RPCs so they happen atomically.
- Triggers make sure everyone on an expense or payment actually belongs to that trip.

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm test           # vitest
```
