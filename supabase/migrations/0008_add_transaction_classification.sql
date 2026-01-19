alter table public.transactions
add column if not exists classification text;

create table if not exists public.classification_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  label text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, description)
);

create index if not exists classification_cache_user_id_idx
  on public.classification_cache(user_id);

alter table public.classification_cache enable row level security;

drop policy if exists classification_cache_owner_select on public.classification_cache;
drop policy if exists classification_cache_owner_insert on public.classification_cache;
drop policy if exists classification_cache_owner_update on public.classification_cache;
drop policy if exists classification_cache_owner_delete on public.classification_cache;

create policy classification_cache_owner_select
on public.classification_cache
for select using (user_id = auth.uid());

create policy classification_cache_owner_insert
on public.classification_cache
for insert with check (user_id = auth.uid());

create policy classification_cache_owner_update
on public.classification_cache
for update using (user_id = auth.uid());

create policy classification_cache_owner_delete
on public.classification_cache
for delete using (user_id = auth.uid());
