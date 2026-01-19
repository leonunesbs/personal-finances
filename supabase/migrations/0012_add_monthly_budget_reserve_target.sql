alter table public.monthly_budgets
add column if not exists reserve_target numeric(14,2) not null default 0;
