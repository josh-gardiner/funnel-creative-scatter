-- Head to Head — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query) once,
-- against a fresh project.

create table if not exists public.settings (
  id text primary key default 'default',
  name_a text not null default 'Player 1',
  name_b text not null default 'Player 2',
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('score', 'reset')),
  side smallint check (side in (0, 1)),
  delta smallint,
  after smallint,
  name text,
  note text,
  detail text
);

create index if not exists events_created_at_idx on public.events (created_at);

-- This app has no login — it's a shared scoreboard for two people on the same
-- devices/link, matching how the original localStorage version worked. RLS is
-- enabled with permissive policies so the anon key can read/write directly
-- from the browser. Do not reuse this schema for anything with private data.
alter table public.settings enable row level security;
alter table public.events enable row level security;

drop policy if exists "settings anon access" on public.settings;
create policy "settings anon access" on public.settings
  for all using (true) with check (true);

drop policy if exists "events anon access" on public.events;
create policy "events anon access" on public.events
  for all using (true) with check (true);

-- Enable realtime so multiple devices see updates live.
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.events;
