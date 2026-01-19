alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.cards enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_types enable row level security;

drop policy if exists accounts_owner_select on public.accounts;
drop policy if exists accounts_owner_insert on public.accounts;
drop policy if exists accounts_owner_update on public.accounts;
drop policy if exists accounts_owner_delete on public.accounts;

create policy accounts_owner_select
on public.accounts
for select using (user_id = auth.uid());

create policy accounts_owner_insert
on public.accounts
for insert with check (user_id = auth.uid());

create policy accounts_owner_update
on public.accounts
for update using (user_id = auth.uid());

create policy accounts_owner_delete
on public.accounts
for delete using (user_id = auth.uid());

drop policy if exists categories_owner_select on public.categories;
drop policy if exists categories_owner_insert on public.categories;
drop policy if exists categories_owner_update on public.categories;
drop policy if exists categories_owner_delete on public.categories;

create policy categories_owner_select
on public.categories
for select using (user_id = auth.uid());

create policy categories_owner_insert
on public.categories
for insert with check (user_id = auth.uid());

create policy categories_owner_update
on public.categories
for update using (user_id = auth.uid());

create policy categories_owner_delete
on public.categories
for delete using (user_id = auth.uid());

drop policy if exists cards_owner_select on public.cards;
drop policy if exists cards_owner_insert on public.cards;
drop policy if exists cards_owner_update on public.cards;
drop policy if exists cards_owner_delete on public.cards;

create policy cards_owner_select
on public.cards
for select using (user_id = auth.uid());

create policy cards_owner_insert
on public.cards
for insert with check (user_id = auth.uid());

create policy cards_owner_update
on public.cards
for update using (user_id = auth.uid());

create policy cards_owner_delete
on public.cards
for delete using (user_id = auth.uid());

drop policy if exists tags_owner_select on public.tags;
drop policy if exists tags_owner_insert on public.tags;
drop policy if exists tags_owner_update on public.tags;
drop policy if exists tags_owner_delete on public.tags;

create policy tags_owner_select
on public.tags
for select using (user_id = auth.uid());

create policy tags_owner_insert
on public.tags
for insert with check (user_id = auth.uid());

create policy tags_owner_update
on public.tags
for update using (user_id = auth.uid());

create policy tags_owner_delete
on public.tags
for delete using (user_id = auth.uid());

drop policy if exists transaction_types_owner_select on public.transaction_types;
drop policy if exists transaction_types_owner_insert on public.transaction_types;
drop policy if exists transaction_types_owner_update on public.transaction_types;
drop policy if exists transaction_types_owner_delete on public.transaction_types;

create policy transaction_types_owner_select
on public.transaction_types
for select using (user_id = auth.uid());

create policy transaction_types_owner_insert
on public.transaction_types
for insert with check (user_id = auth.uid());

create policy transaction_types_owner_update
on public.transaction_types
for update using (user_id = auth.uid());

create policy transaction_types_owner_delete
on public.transaction_types
for delete using (user_id = auth.uid());
