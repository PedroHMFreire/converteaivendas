-- insights_feed schema
-- Run this in Supabase SQL Editor

-- Ensure UUID generator
create extension if not exists "pgcrypto";

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

-- Allow users (authenticated) to read their own feed
drop policy if exists "read own feed" on public.insights_feed;
create policy "read own feed" on public.insights_feed
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow only service role to write (Edge Function)
drop policy if exists "service role writes" on public.insights_feed;
create policy "service role writes" on public.insights_feed
  for all
  to service_role
  using (true)
  with check (true);
