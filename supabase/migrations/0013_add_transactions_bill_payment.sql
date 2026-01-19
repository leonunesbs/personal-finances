alter table public.transactions
  add column is_bill_payment boolean not null default false;

update public.transactions
set is_bill_payment = true
where kind = 'transfer'
  and card_id is not null;
