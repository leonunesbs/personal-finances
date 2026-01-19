alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_owner_select on public.user_profiles;
drop policy if exists user_profiles_owner_insert on public.user_profiles;
drop policy if exists user_profiles_owner_update on public.user_profiles;
drop policy if exists user_profiles_owner_delete on public.user_profiles;

create policy user_profiles_owner_select
on public.user_profiles
for select using (user_id = auth.uid());

create policy user_profiles_owner_insert
on public.user_profiles
for insert with check (user_id = auth.uid());

create policy user_profiles_owner_update
on public.user_profiles
for update using (user_id = auth.uid());

create policy user_profiles_owner_delete
on public.user_profiles
for delete using (user_id = auth.uid());
