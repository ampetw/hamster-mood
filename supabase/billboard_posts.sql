-- Run in Supabase: SQL Editor → New query → paste → Run

create table if not exists public.billboard_posts (
  id uuid primary key default gen_random_uuid(),
  image_id text not null,
  x double precision not null default 0.5,
  y double precision not null default 0.5,
  created_at timestamptz not null default now()
);

-- If you already created the table earlier, add the new columns:
alter table public.billboard_posts add column if not exists x double precision not null default 0.5;
alter table public.billboard_posts add column if not exists y double precision not null default 0.5;

alter table public.billboard_posts enable row level security;

create policy "billboard_select" on public.billboard_posts
  for select using (true);

create policy "billboard_insert" on public.billboard_posts
  for insert with check (true);

create policy "billboard_delete" on public.billboard_posts
  for delete using (true);

-- Live updates for all visitors (run once; ignore error if already added):
alter publication supabase_realtime add table public.billboard_posts;
