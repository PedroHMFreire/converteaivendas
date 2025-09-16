-- insights_feed schema
-- Run this in Supabase SQL Editor

create table if not exists public.insights_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),
  slot_start timestamptz not null,
  kind text not null,
  title text not null,
  description text not null,
  tag text check (tag in ('alert','opportunity','info')) default 'info',
  icon text,
  metric text,
  action text,
  context jsonb default '{}'::jsonb
);

create index if not exists insights_feed_user_created_at_idx on public.insights_feed (user_id, created_at desc);
create index if not exists insights_feed_user_slot_idx on public.insights_feed (user_id, slot_start);
create unique index if not exists insights_feed_user_slot_kind_uniq on public.insights_feed (user_id, slot_start, kind);

-- RLS
alter table public.insights_feed enable row level security;

-- Allow users to read their own feed
create policy if not exists "read own feed" on public.insights_feed
  for select using (auth.uid() = user_id);

-- Block direct writes from client (Edge Function will use service role)
create policy if not exists "deny client writes" on public.insights_feed
  for all to authenticated using (false) with check (false);
