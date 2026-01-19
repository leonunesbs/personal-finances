alter table public.transactions drop column if exists transaction_type_id;
alter table public.recurring_rules drop column if exists transaction_type_id;

drop policy if exists transaction_types_owner_select on public.transaction_types;
drop policy if exists transaction_types_owner_insert on public.transaction_types;
drop policy if exists transaction_types_owner_update on public.transaction_types;
drop policy if exists transaction_types_owner_delete on public.transaction_types;

drop table if exists public.transaction_types;
