alter table public.transactions
  add column is_installment_payment boolean not null default false,
  add column is_recurring_payment boolean not null default false;
