alter table public.transactions enable row level security;

drop policy if exists transactions_owner_select on public.transactions;
drop policy if exists transactions_owner_insert on public.transactions;
drop policy if exists transactions_owner_update on public.transactions;
drop policy if exists transactions_owner_delete on public.transactions;

create policy transactions_owner_select
on public.transactions
for select using (user_id = auth.uid());

create policy transactions_owner_insert
on public.transactions
for insert with check (user_id = auth.uid());

create policy transactions_owner_update
on public.transactions
for update using (user_id = auth.uid());

create policy transactions_owner_delete
on public.transactions
for delete using (user_id = auth.uid());
