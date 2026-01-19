alter table public.monthly_budgets enable row level security;
alter table public.budget_items enable row level security;

drop policy if exists monthly_budgets_owner_select on public.monthly_budgets;
drop policy if exists monthly_budgets_owner_insert on public.monthly_budgets;
drop policy if exists monthly_budgets_owner_update on public.monthly_budgets;
drop policy if exists monthly_budgets_owner_delete on public.monthly_budgets;

create policy monthly_budgets_owner_select
on public.monthly_budgets
for select using (user_id = auth.uid());

create policy monthly_budgets_owner_insert
on public.monthly_budgets
for insert with check (user_id = auth.uid());

create policy monthly_budgets_owner_update
on public.monthly_budgets
for update using (user_id = auth.uid());

create policy monthly_budgets_owner_delete
on public.monthly_budgets
for delete using (user_id = auth.uid());

drop policy if exists budget_items_owner_select on public.budget_items;
drop policy if exists budget_items_owner_insert on public.budget_items;
drop policy if exists budget_items_owner_update on public.budget_items;
drop policy if exists budget_items_owner_delete on public.budget_items;

create policy budget_items_owner_select
on public.budget_items
for select using (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);

create policy budget_items_owner_insert
on public.budget_items
for insert with check (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);

create policy budget_items_owner_update
on public.budget_items
for update using (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);

create policy budget_items_owner_delete
on public.budget_items
for delete using (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);
