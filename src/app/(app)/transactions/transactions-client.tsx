"use client";

import { useMemo, useState } from "react";

import { createTransaction } from "@/app/(app)/transactions/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxField } from "@/components/forms/checkbox-field";

type Account = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

type CardItem = {
  id: string;
  name: string;
  account_id: string | null;
};

type TransactionType = {
  id: string;
  name: string;
};

type Tag = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  description: string | null;
  amount: number;
  occurred_on: string;
  kind: string;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  card_id: string | null;
  transaction_type_id: string | null;
};

type TransactionsClientProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  transactionTypes: TransactionType[];
  tags: Tag[];
  transactions: Transaction[];
};

const transactionKindOptions = [
  { value: "income", label: "Receita" },
  { value: "expense", label: "Despesa" },
  { value: "transfer", label: "Transferência" },
  { value: "investment_contribution", label: "Aporte" },
  { value: "investment_withdrawal", label: "Resgate" },
];

const recurrenceOptions = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
];

export function TransactionsClient({
  accounts,
  categories,
  cards,
  transactionTypes,
  tags,
  transactions,
}: TransactionsClientProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts]
  );
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories]
  );
  const cardOptions = useMemo(() => cards.map((card) => ({ value: card.id, label: card.name })), [cards]);
  const transactionTypeOptions = useMemo(
    () => transactionTypes.map((type) => ({ value: type.id, label: type.name })),
    [transactionTypes]
  );

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card.name])), [cards]);
  const typeMap = useMemo(
    () => new Map(transactionTypes.map((type) => [type.id, type.name])),
    [transactionTypes]
  );
  const cardAccountMap = useMemo(
    () => new Map(cards.map((card) => [card.id, card.account_id ?? ""])),
    [cards]
  );
  const linkedAccountId = selectedCardId ? cardAccountMap.get(selectedCardId) ?? "" : "";
  const isAccountLocked = Boolean(linkedAccountId);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transações</h1>
        <p className="text-sm">Registre receitas, despesas, transferências e investimentos.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-2" action={createTransaction}>
            {selectedTags.map((tagId) => (
              <input key={tagId} type="hidden" name="tag_ids" value={tagId} />
            ))}
            <SelectField name="kind" label="Tipo de lançamento" options={transactionKindOptions} />
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <CurrencyInput id="amount" name="amount" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurred_on">Data</Label>
              <Input id="occurred_on" name="occurred_on" type="date" required />
            </div>
            <SelectField
              name="account_id"
              label="Conta"
              options={accountOptions}
              value={selectedAccountId}
              disabled={isAccountLocked}
              onValueChange={setSelectedAccountId}
            />
            <SelectField name="to_account_id" label="Conta destino (transferência)" options={accountOptions} />
            <SelectField name="category_id" label="Categoria" options={categoryOptions} />
            <SelectField
              name="card_id"
              label="Cartão"
              options={cardOptions}
              placeholder="Opcional"
              value={selectedCardId}
              onValueChange={(nextCardId) => {
                setSelectedCardId(nextCardId);
                const nextLinkedAccountId = cardAccountMap.get(nextCardId) ?? "";
                if (nextLinkedAccountId) {
                  setSelectedAccountId(nextLinkedAccountId);
                }
              }}
            />
            <SelectField name="transaction_type_id" label="Tipo configurado" options={transactionTypeOptions} />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas</Label>
              <Input id="installments" name="installments" type="number" min={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_installment_on">Primeira parcela</Label>
              <Input id="first_installment_on" name="first_installment_on" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Tags</p>
              <div className="grid gap-2 md:grid-cols-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    />
                    <Label htmlFor={`tag-${tag.id}`}>{tag.name}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 md:col-span-2">
              <CheckboxField name="is_recurring" label="Gerar recorrência" />
              <div className="grid gap-4 md:grid-cols-3">
                <SelectField name="recurrence_frequency" label="Frequência" options={recurrenceOptions} />
                <div className="space-y-2">
                  <Label htmlFor="recurrence_interval">Intervalo</Label>
                  <Input id="recurrence_interval" name="recurrence_interval" type="number" min={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence_occurrences">Ocorrências</Label>
                  <Input id="recurrence_occurrences" name="recurrence_occurrences" type="number" min={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_on">Término</Label>
                  <Input id="recurrence_end_on" name="recurrence_end_on" type="date" />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Salvar lançamento</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Últimas transações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.occurred_on}</TableCell>
                  <TableCell>{transaction.description ?? "-"}</TableCell>
                  <TableCell>{transaction.kind}</TableCell>
                  <TableCell>{transaction.account_id ? accountMap.get(transaction.account_id) : "-"}</TableCell>
                  <TableCell>{transaction.category_id ? categoryMap.get(transaction.category_id) : "-"}</TableCell>
                  <TableCell>{Number(transaction.amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
