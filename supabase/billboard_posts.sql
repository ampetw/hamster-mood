-- Run in Supabase: SQL Editor → New query → paste → Run

-- Hamster + text posts
create table if not exists public.billboard_posts (
  id uuid primary key default gen_random_uuid(),
  image_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Upgrading from older versions (text-only or stamp board):
alter table public.billboard_posts add column if not exists image_id text;
alter table public.billboard_posts add column if not exists content text;

update public.billboard_posts
set image_id = coalesce(nullif(btrim(image_id), ''), 'blush')
where image_id is null or btrim(image_id) = '';

update public.billboard_posts
set content = coalesce(nullif(btrim(content), ''), '(no message)')
where content is null or btrim(content) = '';

alter table public.billboard_posts alter column image_id set not null;
alter table public.billboard_posts alter column content set not null;

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
