"use client";

import { createAccount, createCard, createCardPayment, createCategory, createTag } from "@/app/(app)/settings/actions";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getStatementDueDate, getStatementWindow, toDateString } from "@/lib/finance";

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

export function SettingsClient({ accounts, categories, cards, tags, transactions }: SettingsClientProps) {
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));
  const cardOptions = cards.map((card) => ({ value: card.id, label: card.name }));
  const cashAccountOptions = accounts
    .filter((account) => account.type !== "credit")
    .map((account) => ({ value: account.id, label: account.name }));
  const todayLabel = toDateString(new Date());
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
              <form className="grid gap-4 md:grid-cols-2" action={createAccount}>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Nome</Label>
                  <Input id="account-name" name="name" required />
                </div>
                <SelectField name="type" label="Tipo" options={accountTypeOptions} />
                <SelectField name="currency" label="Moeda" options={currencyOptions} defaultValue="BRL" />
                <div className="space-y-2">
                  <Label htmlFor="account-initial">Saldo inicial</Label>
                  <CurrencyInput id="account-initial" name="initial_balance" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Salvar conta</Button>
                </div>
              </form>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Saldo inicial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell>{account.currency}</TableCell>
                      <TableCell>{Number(account.initial_balance).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Fatura atual</TableHead>
                    <TableHead>Uso do limite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => {
                    const statement = statementByCard.get(card.id);
                    const total = statement?.total ?? 0;
                    const usage = card.limit_amount > 0 ? (total / card.limit_amount) * 100 : 0;
                    return (
                      <TableRow key={card.id}>
                        <TableCell>{card.name}</TableCell>
                        <TableCell>{card.account_id ? accountMap.get(card.account_id) : "-"}</TableCell>
                        <TableCell>{card.closing_day}</TableCell>
                        <TableCell>{card.due_day}</TableCell>
                        <TableCell>{formatCurrency(card.limit_amount)}</TableCell>
                        <TableCell>
                          {formatCurrency(total)}
                          {statement && (
                            <span className="block text-xs text-muted-foreground">
                              {statement.window.startLabel} → {statement.window.endLabel} • Vence em{" "}
                              {toDateString(statement.dueDate)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{usage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                    <Input id="card-payment-date" name="occurred_on" type="date" defaultValue={todayLabel} />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>{tag.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
