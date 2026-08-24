# Head to Head

A two-player head-to-head game tally tracker: tally scores, +/− steppers, a
series-order strip, a daily log, undo, and CSV export. Backed by Supabase so
history persists across days and devices instead of living in one phone's
browser.

## Stack

- Static Vite app — plain HTML/CSS/JS, no framework
- [`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript) for storage + realtime sync
- Deploys to Vercel as a static site

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema** — open the SQL Editor in your project and run
   [`supabase/schema.sql`](./supabase/schema.sql). This creates the
   `settings` and `events` tables, sets permissive RLS policies (there's no
   login — it's a shared scoreboard, same as the original localStorage
   version), and enables realtime.
3. **Copy your API keys** — Project Settings → API → Project URL and the
   `anon` `public` key.
4. **Set env vars** — copy `.env.example` to `.env` and fill in the two
   values, or set them in your Vercel project settings.
5. Install and run locally:

   ```bash
   npm install
   npm run dev
   ```

## Deploy

Import the repo into Vercel (vercel.com → Add New → Project). Vercel
auto-detects the Vite framework preset — no extra config needed. Add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in
the Vercel project settings before the first deploy. Every push to `main`
auto-deploys.

## Data model

Everything is derived by replaying an append-only `events` table (one row per
+1/−1 or series reset), plus a single `settings` row for player names. Undo
deletes the most recent score event; a reset inserts a marker event without
erasing history, so the daily log always reflects everything that happened.

Multiple devices open on the same scoreboard stay in sync live via Supabase
Realtime.
