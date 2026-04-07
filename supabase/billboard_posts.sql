-- Run in Supabase: SQL Editor → New query → paste → Run

-- New project: text-only shared posts
create table if not exists public.billboard_posts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

-- Upgrading from hamster / stamp versions (image_id, x, y):
alter table public.billboard_posts add column if not exists content text;
update public.billboard_posts
set content = coalesce(nullif(btrim(content), ''), '(earlier post)')
where content is null or btrim(content) = '';
alter table public.billboard_posts alter column content set not null;
alter table public.billboard_posts drop column if exists image_id;
alter table public.billboard_posts drop column if exists x;
alter table public.billboard_posts drop column if exists y;

alter table public.billboard_posts enable row level security;

create policy "billboard_select" on public.billboard_posts
  for select using (true);

create policy "billboard_insert" on public.billboard_posts
  for insert with check (true);

create policy "billboard_delete" on public.billboard_posts
  for delete using (true);

-- Live updates (run once; ignore error if already added):
alter publication supabase_realtime add table public.billboard_posts;
