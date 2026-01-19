"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { createAccount, createCard, createCardPayment, createCategory, createTag } from "@/app/(app)/settings/actions";
import { CurrencyInput } from "@/components/forms/currency-input";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getStatementDueDate, getStatementWindow, toDateString, type CurrencyCode } from "@/lib/finance";

type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  initial_balance: number;
};

type Category = {
  id: string;
  name: string;
};

type CardItem = {
  id: string;
  name: string;
  account_id: string | null;
  last4: string | null;
  closing_day: number;
  due_day: number;
  limit_amount: number;
};

type Tag = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  card_id: string | null;
  amount: number;
  kind: string;
  occurred_on: string;
  account_id: string | null;
  to_account_id: string | null;
};

type SettingsClientProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  tags: Tag[];
  transactions: Transaction[];
};

const accountTypeOptions = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit", label: "Cartão" },
  { value: "investment", label: "Investimento" },
];

const currencyOptions = [
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

export function SettingsClient({
  accounts,
  categories,
  cards,
  tags,
  transactions,
}: SettingsClientProps) {
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));
  const cardOptions = cards.map((card) => ({ value: card.id, label: card.name }));
  const cashAccountOptions = accounts
    .filter((account) => account.type !== "credit")
    .map((account) => ({ value: account.id, label: account.name }));
  const todayLabel = toDateString(new Date());
  const currentBalanceByAccount = new Map<string, number>();

  accounts.forEach((account) => {
    currentBalanceByAccount.set(account.id, Number(account.initial_balance ?? 0));
  });

  transactions.forEach((transaction) => {
    const amount = Number(transaction.amount ?? 0);
    if (!Number.isFinite(amount) || amount === 0) return;

    if (transaction.kind === "transfer") {
      if (transaction.account_id) {
        const current = currentBalanceByAccount.get(transaction.account_id) ?? 0;
        currentBalanceByAccount.set(transaction.account_id, current - amount);
      }
      if (transaction.to_account_id) {
        const current = currentBalanceByAccount.get(transaction.to_account_id) ?? 0;
        currentBalanceByAccount.set(transaction.to_account_id, current + amount);
      }
      return;
    }

    if (!transaction.account_id) return;

    const current = currentBalanceByAccount.get(transaction.account_id) ?? 0;
    if (transaction.kind === "income" || transaction.kind === "investment_withdrawal") {
      currentBalanceByAccount.set(transaction.account_id, current + amount);
      return;
    }

    if (transaction.kind === "expense" || transaction.kind === "investment_contribution") {
      currentBalanceByAccount.set(transaction.account_id, current - amount);
    }
  });
  const statementByCard = new Map(
    cards.map((card) => {
      const now = new Date();
      const window = getStatementWindow(card.closing_day, now);
      const effectiveEnd = now > window.end ? window.end : now;
      const dueDate = getStatementDueDate(window.closingDate, card.due_day);
      const total = transactions
        .filter((transaction) => transaction.card_id === card.id && transaction.kind !== "transfer")
        .filter((transaction) => {
          const occurredOn = new Date(`${transaction.occurred_on}T00:00:00`);
          return occurredOn >= window.start && occurredOn <= effectiveEnd;
        })
        .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

      return [card.id, { total, dueDate, window }];
    })
  );

  const accountColumns: ColumnDef<Account>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => row.original.type,
    },
    {
      accessorKey: "currency",
      header: "Moeda",
      cell: ({ row }) => row.original.currency,
    },
    {
      id: "balance",
      header: "Saldo atual",
      cell: ({ row }) =>
        formatCurrency(
          currentBalanceByAccount.get(row.original.id) ??
            row.original.initial_balance,
          row.original.currency as CurrencyCode
        ),
    },
  ];

  const categoryColumns: ColumnDef<Category>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => row.original.name,
    },
  ];

  const cardColumns: ColumnDef<CardItem>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => row.original.name,
    },
    {
      id: "account",
      header: "Conta",
      cell: ({ row }) =>
        row.original.account_id ? accountMap.get(row.original.account_id) : "-",
    },
    {
      accessorKey: "closing_day",
      header: "Fechamento",
      cell: ({ row }) => row.original.closing_day,
    },
    {
      accessorKey: "due_day",
      header: "Vencimento",
      cell: ({ row }) => row.original.due_day,
    },
    {
      accessorKey: "limit_amount",
      header: "Limite",
      cell: ({ row }) => formatCurrency(row.original.limit_amount),
    },
    {
      id: "statement",
      header: "Fatura atual",
      cell: ({ row }) => {
        const statement = statementByCard.get(row.original.id);
        const total = statement?.total ?? 0;
        return (
          <>
            {formatCurrency(total)}
            {statement && (
              <span className="block text-xs text-muted-foreground">
                {statement.window.startLabel} → {statement.window.endLabel} • Vence em{" "}
                {toDateString(statement.dueDate)}
              </span>
            )}
          </>
        );
      },
    },
    {
      id: "usage",
      header: "Uso do limite",
      cell: ({ row }) => {
        const statement = statementByCard.get(row.original.id);
        const total = statement?.total ?? 0;
        const usage =
          row.original.limit_amount > 0
            ? (total / row.original.limit_amount) * 100
            : 0;
        return `${usage.toFixed(1)}%`;
      },
    },
  ];

  const tagColumns: ColumnDef<Tag>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => row.original.name,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm">Cadastre contas, categorias e tipos para classificar os lançamentos.</p>
      </div>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="cards">Cartões</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Nova conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                className="grid gap-4 md:grid-cols-2"
                action={createAccount}
              >
                <div className="space-y-2">
                  <Label htmlFor="account-name">Nome</Label>
                  <Input id="account-name" name="name" required />
                </div>
                <SelectField name="type" label="Tipo" options={accountTypeOptions} defaultValue="checking" />
                <SelectField name="currency" label="Moeda" options={currencyOptions} defaultValue="BRL" />
                <div className="space-y-2">
                  <Label htmlFor="account-initial">Saldo inicial</Label>
                  <CurrencyInput id="account-initial" name="initial_balance" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Salvar conta</Button>
                </div>
              </form>
              <DataTable columns={accountColumns} data={accounts} emptyMessage="Nenhuma conta encontrada." />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Nova categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="grid gap-4 md:grid-cols-2" action={createCategory}>
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nome</Label>
                  <Input id="category-name" name="name" required />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Salvar categoria</Button>
                </div>
              </form>
              <DataTable columns={categoryColumns} data={categories} emptyMessage="Nenhuma categoria encontrada." />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cards">
          <Card>
            <CardHeader>
              <CardTitle>Novo cartão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="grid gap-4 md:grid-cols-2" action={createCard}>
                <div className="space-y-2">
                  <Label htmlFor="card-name">Nome</Label>
                  <Input id="card-name" name="name" required />
                </div>
                <SelectField
                  name="account_id"
                  label="Conta vinculada"
                  options={accounts.map((account) => ({ value: account.id, label: account.name }))}
                  placeholder="Opcional"
                />
                <div className="space-y-2">
                  <Label htmlFor="card-last4">Últimos 4 dígitos</Label>
                  <Input id="card-last4" name="last4" maxLength={4} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-closing">Dia de fechamento</Label>
                  <Input id="card-closing" name="closing_day" type="number" min={1} max={31} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-due">Dia de vencimento</Label>
                  <Input id="card-due" name="due_day" type="number" min={1} max={31} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-limit">Limite</Label>
                  <CurrencyInput id="card-limit" name="limit_amount" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Salvar cartão</Button>
                </div>
              </form>
              <DataTable columns={cardColumns} data={cards} emptyMessage="Nenhum cartão encontrado." />
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold">Pagamento de fatura</h3>
                <p className="text-sm text-muted-foreground">
                  Registre o pagamento como transferência da conta corrente para a conta do cartão.
                </p>
                <form className="mt-4 grid gap-4 md:grid-cols-4" action={createCardPayment}>
                  <SelectField name="card_id" label="Cartão" options={cardOptions} />
                  <SelectField name="account_id" label="Conta de pagamento" options={cashAccountOptions} />
                  <div className="space-y-2">
                    <Label htmlFor="card-payment-amount">Valor</Label>
                    <CurrencyInput id="card-payment-amount" name="amount" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-payment-date">Data</Label>
                    <DatePickerField
                      id="card-payment-date"
                      name="occurred_on"
                      defaultValue={todayLabel}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Button type="submit">Pagar fatura</Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle>Nova tag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="grid gap-4 md:grid-cols-2" action={createTag}>
                <div className="space-y-2">
                  <Label htmlFor="tag-name">Nome</Label>
                  <Input id="tag-name" name="name" required />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Salvar tag</Button>
                </div>
              </form>
              <DataTable columns={tagColumns} data={tags} emptyMessage="Nenhuma tag encontrada." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
