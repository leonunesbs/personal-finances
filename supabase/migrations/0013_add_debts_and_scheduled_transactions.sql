create type debt_kind as enum (
  'payable',
  'receivable'
);

create type debt_status as enum (
  'active',
  'settled',
  'cancelled'
);

create type debt_installment_status as enum (
  'pending',
  'paid',
  'cancelled'
);

create type scheduled_transaction_kind as enum (
  'payable',
  'receivable'
);

create type scheduled_transaction_status as enum (
  'pending',
  'completed',
  'cancelled'
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind debt_kind not null,
  balance numeric(14,2) not null check (balance >= 0),
  interest_rate numeric(6,3) check (interest_rate is null or interest_rate >= 0),
  start_on date not null,
  status debt_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index debts_user_id_idx on public.debts(user_id);
create index debts_status_idx on public.debts(status);

create table public.debt_installments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  installment_number int not null check (installment_number > 0),
  total_installments int not null check (total_installments > 0),
  due_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  status debt_installment_status not null default 'pending',
  paid_on date,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (installment_number <= total_installments)
);

create index debt_installments_debt_id_idx on public.debt_installments(debt_id);
create index debt_installments_due_on_idx on public.debt_installments(due_on);

create table public.scheduled_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind scheduled_transaction_kind not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  due_on date not null,
  account_id uuid not null references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  notes text,
  status scheduled_transaction_status not null default 'pending',
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_transactions_user_id_idx on public.scheduled_transactions(user_id);
create index scheduled_transactions_due_on_idx on public.scheduled_transactions(due_on);

create trigger set_debts_updated_at
before update on public.debts
for each row execute procedure public.set_updated_at();

create trigger set_debt_installments_updated_at
before update on public.debt_installments
for each row execute procedure public.set_updated_at();

create trigger set_scheduled_transactions_updated_at
before update on public.scheduled_transactions
for each row execute procedure public.set_updated_at();

alter table public.debts enable row level security;
alter table public.debt_installments enable row level security;
alter table public.scheduled_transactions enable row level security;

create policy debts_owner_select
on public.debts
for select using (user_id = auth.uid());

create policy debts_owner_insert
on public.debts
for insert with check (user_id = auth.uid());

create policy debts_owner_update
on public.debts
for update using (user_id = auth.uid());

create policy debts_owner_delete
on public.debts
for delete using (user_id = auth.uid());

create policy debt_installments_owner_select
on public.debt_installments
for select using (
  exists (
    select 1
    from public.debts d
    where d.id = debt_installments.debt_id
      and d.user_id = auth.uid()
  )
);

create policy debt_installments_owner_insert
on public.debt_installments
for insert with check (
  exists (
    select 1
    from public.debts d
    where d.id = debt_installments.debt_id
      and d.user_id = auth.uid()
  )
);

create policy debt_installments_owner_update
on public.debt_installments
for update using (
  exists (
    select 1
    from public.debts d
    where d.id = debt_installments.debt_id
      and d.user_id = auth.uid()
  )
);

create policy debt_installments_owner_delete
on public.debt_installments
for delete using (
  exists (
    select 1
    from public.debts d
    where d.id = debt_installments.debt_id
      and d.user_id = auth.uid()
  )
);

create policy scheduled_transactions_owner_select
on public.scheduled_transactions
for select using (user_id = auth.uid());

create policy scheduled_transactions_owner_insert
on public.scheduled_transactions
for insert with check (user_id = auth.uid());

create policy scheduled_transactions_owner_update
on public.scheduled_transactions
for update using (user_id = auth.uid());

create policy scheduled_transactions_owner_delete
on public.scheduled_transactions
for delete using (user_id = auth.uid());
