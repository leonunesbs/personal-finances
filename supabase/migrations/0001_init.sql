create extension if not exists "pgcrypto";

create type transaction_kind as enum (
  'income',
  'expense',
  'transfer',
  'investment_contribution',
  'investment_withdrawal'
);

create type account_type as enum (
  'checking',
  'savings',
  'cash',
  'credit',
  'investment'
);

create type category_kind as enum (
  'income',
  'expense',
  'investment'
);

create type recurrence_frequency as enum (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null,
  currency text not null default 'BRL',
  initial_balance numeric(14,2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  last4 text,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  limit_amount numeric(14,2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_user_id_idx on public.cards(user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind category_kind not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name, kind)
);

create index categories_user_id_idx on public.categories(user_id);

create table public.transaction_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind transaction_kind not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name, kind)
);

create index transaction_types_user_id_idx on public.transaction_types(user_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create index tags_user_id_idx on public.tags(user_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind transaction_kind not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  transaction_type_id uuid references public.transaction_types(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and account_id is not null and to_account_id is not null)
    or
    (kind <> 'transfer' and to_account_id is null and account_id is not null)
  )
);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_occurred_on_idx on public.transactions(occurred_on);

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind transaction_kind not null,
  description text,
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  transaction_type_id uuid references public.transaction_types(id) on delete set null,
  start_on date not null,
  end_on date,
  frequency recurrence_frequency not null,
  interval int not null default 1 check (interval > 0),
  occurrences int check (occurrences is null or occurrences > 0),
  next_run_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and account_id is not null and to_account_id is not null)
    or
    (kind <> 'transfer' and to_account_id is null and account_id is not null)
  )
);

create index recurring_rules_user_id_idx on public.recurring_rules(user_id);

create table public.transaction_installments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  installment_number int not null check (installment_number > 0),
  total_installments int not null check (total_installments > 0),
  due_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  paid boolean not null default false,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (installment_number <= total_installments)
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  income_target numeric(14,2) not null default 0,
  expense_limit numeric(14,2) not null default 0,
  investment_target numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month)
);

create index monthly_budgets_user_id_idx on public.monthly_budgets(user_id);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_id uuid not null references public.monthly_budgets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount_limit numeric(14,2) not null check (amount_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(monthly_budget_id, category_id)
);

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute procedure public.set_updated_at();

create trigger set_accounts_updated_at
before update on public.accounts
for each row execute procedure public.set_updated_at();

create trigger set_cards_updated_at
before update on public.cards
for each row execute procedure public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row execute procedure public.set_updated_at();

create trigger set_transaction_types_updated_at
before update on public.transaction_types
for each row execute procedure public.set_updated_at();

create trigger set_tags_updated_at
before update on public.tags
for each row execute procedure public.set_updated_at();

create trigger set_transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

create trigger set_recurring_rules_updated_at
before update on public.recurring_rules
for each row execute procedure public.set_updated_at();

create trigger set_transaction_installments_updated_at
before update on public.transaction_installments
for each row execute procedure public.set_updated_at();

create trigger set_monthly_budgets_updated_at
before update on public.monthly_budgets
for each row execute procedure public.set_updated_at();

create trigger set_budget_items_updated_at
before update on public.budget_items
for each row execute procedure public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.categories enable row level security;
alter table public.transaction_types enable row level security;
alter table public.tags enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.transaction_installments enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.budget_items enable row level security;

create policy "user_profiles_owner_select"
on public.user_profiles
for select using (id = auth.uid());

create policy "user_profiles_owner_insert"
on public.user_profiles
for insert with check (id = auth.uid());

create policy "user_profiles_owner_update"
on public.user_profiles
for update using (id = auth.uid());

create policy "user_profiles_owner_delete"
on public.user_profiles
for delete using (id = auth.uid());

create policy "accounts_owner_select"
on public.accounts
for select using (user_id = auth.uid());

create policy "accounts_owner_insert"
on public.accounts
for insert with check (user_id = auth.uid());

create policy "accounts_owner_update"
on public.accounts
for update using (user_id = auth.uid());

create policy "accounts_owner_delete"
on public.accounts
for delete using (user_id = auth.uid());

create policy "cards_owner_select"
on public.cards
for select using (user_id = auth.uid());

create policy "cards_owner_insert"
on public.cards
for insert with check (user_id = auth.uid());

create policy "cards_owner_update"
on public.cards
for update using (user_id = auth.uid());

create policy "cards_owner_delete"
on public.cards
for delete using (user_id = auth.uid());

create policy "categories_owner_select"
on public.categories
for select using (user_id = auth.uid());

create policy "categories_owner_insert"
on public.categories
for insert with check (user_id = auth.uid());

create policy "categories_owner_update"
on public.categories
for update using (user_id = auth.uid());

create policy "categories_owner_delete"
on public.categories
for delete using (user_id = auth.uid());

create policy "transaction_types_owner_select"
on public.transaction_types
for select using (user_id = auth.uid());

create policy "transaction_types_owner_insert"
on public.transaction_types
for insert with check (user_id = auth.uid());

create policy "transaction_types_owner_update"
on public.transaction_types
for update using (user_id = auth.uid());

create policy "transaction_types_owner_delete"
on public.transaction_types
for delete using (user_id = auth.uid());

create policy "tags_owner_select"
on public.tags
for select using (user_id = auth.uid());

create policy "tags_owner_insert"
on public.tags
for insert with check (user_id = auth.uid());

create policy "tags_owner_update"
on public.tags
for update using (user_id = auth.uid());

create policy "tags_owner_delete"
on public.tags
for delete using (user_id = auth.uid());

create policy "transactions_owner_select"
on public.transactions
for select using (user_id = auth.uid());

create policy "transactions_owner_insert"
on public.transactions
for insert with check (user_id = auth.uid());

create policy "transactions_owner_update"
on public.transactions
for update using (user_id = auth.uid());

create policy "transactions_owner_delete"
on public.transactions
for delete using (user_id = auth.uid());

create policy "transaction_tags_owner_select"
on public.transaction_tags
for select using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_tags.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "transaction_tags_owner_insert"
on public.transaction_tags
for insert with check (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_tags.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "transaction_tags_owner_delete"
on public.transaction_tags
for delete using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_tags.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "recurring_rules_owner_select"
on public.recurring_rules
for select using (user_id = auth.uid());

create policy "recurring_rules_owner_insert"
on public.recurring_rules
for insert with check (user_id = auth.uid());

create policy "recurring_rules_owner_update"
on public.recurring_rules
for update using (user_id = auth.uid());

create policy "recurring_rules_owner_delete"
on public.recurring_rules
for delete using (user_id = auth.uid());

create policy "transaction_installments_owner_select"
on public.transaction_installments
for select using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_installments.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "transaction_installments_owner_insert"
on public.transaction_installments
for insert with check (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_installments.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "transaction_installments_owner_update"
on public.transaction_installments
for update using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_installments.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "transaction_installments_owner_delete"
on public.transaction_installments
for delete using (
  exists (
    select 1
    from public.transactions t
    where t.id = transaction_installments.transaction_id
      and t.user_id = auth.uid()
  )
);

create policy "monthly_budgets_owner_select"
on public.monthly_budgets
for select using (user_id = auth.uid());

create policy "monthly_budgets_owner_insert"
on public.monthly_budgets
for insert with check (user_id = auth.uid());

create policy "monthly_budgets_owner_update"
on public.monthly_budgets
for update using (user_id = auth.uid());

create policy "monthly_budgets_owner_delete"
on public.monthly_budgets
for delete using (user_id = auth.uid());

create policy "budget_items_owner_select"
on public.budget_items
for select using (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);

create policy "budget_items_owner_insert"
on public.budget_items
for insert with check (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);

create policy "budget_items_owner_update"
on public.budget_items
for update using (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);

create policy "budget_items_owner_delete"
on public.budget_items
for delete using (
  exists (
    select 1
    from public.monthly_budgets b
    where b.id = budget_items.monthly_budget_id
      and b.user_id = auth.uid()
  )
);
