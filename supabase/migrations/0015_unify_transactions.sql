-- Migration: Simplify transactions - no distinction between future transactions and debts
-- All are just transactions that can be in the future and can be paid or unpaid

-- Step 1: Add fields to support future and installment transactions
alter table public.transactions
  add column if not exists installment_number int check (installment_number is null or installment_number > 0),
  add column if not exists total_installments int check (total_installments is null or total_installments > 0),
  add column if not exists parent_transaction_id uuid references public.transactions(id) on delete cascade,
  add column if not exists is_paid boolean not null default true,
  add column if not exists paid_on date;

-- Add check constraint for installment logic
alter table public.transactions
  add constraint installments_check 
  check (
    (installment_number is null and total_installments is null) or
    (installment_number is not null and total_installments is not null and installment_number <= total_installments)
  );

-- Add index for parent_transaction_id
create index if not exists transactions_parent_id_idx on public.transactions(parent_transaction_id);

-- Step 2: Create trigger to ensure parent transaction belongs to same user
create or replace function check_parent_transaction_owner()
returns trigger as $$
begin
  if new.parent_transaction_id is not null then
    if not exists (
      select 1 
      from public.transactions 
      where id = new.parent_transaction_id 
        and user_id = new.user_id
    ) then
      raise exception 'Parent transaction must belong to the same user';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists check_parent_transaction_owner_trigger on public.transactions;
create trigger check_parent_transaction_owner_trigger
  before insert or update on public.transactions
  for each row
  when (new.parent_transaction_id is not null)
  execute function check_parent_transaction_owner();

-- Step 3: Drop old tables if they exist (debts, scheduled_transactions, etc)
drop table if exists public.debt_installments cascade;
drop table if exists public.debts cascade;
drop table if exists public.scheduled_transactions cascade;
drop table if exists public.transaction_installments cascade;

-- Step 4: Drop old types if they exist
drop type if exists debt_installment_status;
drop type if exists debt_status;
drop type if exists debt_kind;
drop type if exists scheduled_transaction_status;
drop type if exists scheduled_transaction_kind;

-- Now everything is just a transaction:
-- - Future transactions: occurred_on > today, is_paid = false
-- - Past unpaid transactions: occurred_on <= today, is_paid = false  
-- - Paid transactions: is_paid = true, paid_on = actual payment date
-- - Installments: installment_number/total_installments set, optionally parent_transaction_id
