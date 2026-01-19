"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { createTransaction } from "@/app/(app)/transactions/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/forms/currency-input";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Account = {
  id: string;
  name: string;
  type: string;
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
};

type TransactionsClientProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  tags: Tag[];
  transactions: Transaction[];
};

const transactionKindOptions = [
  {
    value: "income",
    label: "Receita",
    description: "Entradas como salário ou vendas.",
    icon: ArrowDownLeft,
  },
  {
    value: "expense",
    label: "Despesa",
    description: "Saídas do dia a dia e contas.",
    icon: ArrowUpRight,
  },
  {
    value: "transfer",
    label: "Transferência",
    description: "Movimente entre suas contas.",
    icon: ArrowLeftRight,
  },
  {
    value: "investment_contribution",
    label: "Aporte",
    description: "Aplique em investimentos.",
    icon: TrendingUp,
  },
  {
    value: "investment_withdrawal",
    label: "Resgate",
    description: "Retire do investimento.",
    icon: TrendingDown,
  },
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
  tags,
  transactions,
}: TransactionsClientProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [transactionKind, setTransactionKind] = useState("expense");
  const [isRecurring, setIsRecurring] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts]
  );
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories]
  );
  const allCardOptions = useMemo(() => cards.map((card) => ({ value: card.id, label: card.name })), [cards]);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card.name])), [cards]);
  const cardAccountMap = useMemo(
    () => new Map(cards.map((card) => [card.id, card.account_id ?? ""])),
    [cards]
  );
  const accountTypeMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.type])),
    [accounts]
  );
  const linkedAccountId = selectedCardId ? cardAccountMap.get(selectedCardId) ?? "" : "";
  const isAccountLocked = Boolean(linkedAccountId);
  const isCreditAccountSelected =
    Boolean(selectedAccountId) && accountTypeMap.get(selectedAccountId) === "credit";
  const filteredCardOptions = useMemo(() => {
    if (!isCreditAccountSelected || !selectedAccountId) {
      return allCardOptions;
    }

    return cards
      .filter((card) => card.account_id === selectedAccountId)
      .map((card) => ({ value: card.id, label: card.name }));
  }, [allCardOptions, cards, isCreditAccountSelected, selectedAccountId]);
  const shouldShowCard = isCreditAccountSelected;
  const hasSelectedCard = Boolean(selectedCardId);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Selecionar tudo"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Selecionar linha"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "occurred_on",
        header: "Data",
        cell: ({ row }) => {
          const rawDate = row.original.occurred_on;
          if (!rawDate) return "-";
          const parsed = parseISO(rawDate);
          return Number.isNaN(parsed.getTime()) ? rawDate : format(parsed, "dd/MM/yyyy");
        },
      },
      {
        accessorKey: "description",
        header: "Descrição",
        cell: ({ row }) => row.original.description ?? "-",
      },
      {
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => row.original.kind,
      },
      {
        id: "account",
        header: "Conta",
        cell: ({ row }) =>
          row.original.account_id ? accountMap.get(row.original.account_id) : "-",
      },
      {
        id: "category",
        header: "Categoria",
        cell: ({ row }) =>
          row.original.category_id
            ? categoryMap.get(row.original.category_id)
            : "-",
      },
      {
        accessorKey: "amount",
        header: "Valor",
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
    ],
    [accountMap, categoryMap]
  );

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
          <form className="space-y-6" action={createTransaction}>
            {selectedTags.map((tagId) => (
              <input key={tagId} type="hidden" name="tag_ids" value={tagId} />
            ))}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Preencha só o essencial</p>
                <p className="text-sm text-muted-foreground">
                  O restante fica nos detalhes. Menos campos na tela, mais fluidez no lançamento.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold">Essencial</h2>
                  <p className="text-xs text-muted-foreground">
                    Comece pelo básico para registrar rápido.
                  </p>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tipo de lançamento</Label>
                    <div className="grid auto-rows-fr gap-3 md:grid-cols-3">
                      {transactionKindOptions.map((option) => {
                        const isSelected = transactionKind === option.value;
                        const Icon = option.icon;

                        return (
                          <label
                            key={option.value}
                            className={cn(
                              "flex h-full cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:border-primary/60 hover:bg-muted/40 md:min-h-[92px]",
                              isSelected && "border-primary bg-primary/10 shadow-sm"
                            )}
                          >
                            <input
                              type="radio"
                              name="kind"
                              value={option.value}
                              checked={isSelected}
                              onChange={() => setTransactionKind(option.value)}
                              className="sr-only"
                            />
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-md border bg-background",
                                isSelected && "border-primary bg-primary/10 text-primary"
                              )}
                            >
                              <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <div className="flex flex-1 flex-col gap-1">
                              <p className="text-sm font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">Escolha o tipo para adaptar o restante do fluxo.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input id="description" name="description" placeholder="Ex: Supermercado, salário, aluguel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <CurrencyInput id="amount" name="amount" required />
                    <p className="text-xs text-muted-foreground">Use valores positivos. O tipo define o sentido.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occurred_on">Data</Label>
                    <DatePickerField id="occurred_on" name="occurred_on" required />
                  </div>
                  <SelectField
                    name="account_id"
                    label="Conta"
                    options={accountOptions}
                    value={selectedAccountId}
                    disabled={isAccountLocked}
                    onValueChange={(nextAccountId) => {
                      setSelectedAccountId(nextAccountId);
                      const nextAccountType = accountTypeMap.get(nextAccountId);
                      if (nextAccountType === "credit") {
                        const nextCardAccountId = selectedCardId
                          ? cardAccountMap.get(selectedCardId) ?? ""
                          : "";
                        if (nextCardAccountId !== nextAccountId) {
                          setSelectedCardId("");
                          setIsRecurring(false);
                          setShowInstallments(false);
                        }
                      } else {
                        setSelectedCardId("");
                        setIsRecurring(false);
                        setShowInstallments(false);
                      }
                    }}
                  />
                  <SelectField name="category_id" label="Categoria" options={categoryOptions} placeholder="Opcional" />
                </div>
              </section>
              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold">Detalhes</h2>
                  <p className="text-xs text-muted-foreground">
                    Complete com cartão, parcelas e tags quando fizer sentido.
                  </p>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  {transactionKind === "transfer" ? (
                    <SelectField name="to_account_id" label="Conta destino" options={accountOptions} />
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
                      Conta destino aparece apenas para transferências.
                    </div>
                  )}
                  {shouldShowCard && (
                    <div className="space-y-1">
                      <SelectField
                        name="card_id"
                        label="Cartão"
                        options={filteredCardOptions}
                        placeholder={isCreditAccountSelected ? "Obrigatório" : "Opcional"}
                        value={selectedCardId}
                        onValueChange={(nextCardId) => {
                          setSelectedCardId(nextCardId);
                          const nextLinkedAccountId = cardAccountMap.get(nextCardId) ?? "";
                          if (nextLinkedAccountId) {
                            setSelectedAccountId(nextLinkedAccountId);
                          }
                          if (!nextCardId) {
                            setIsRecurring(false);
                            setShowInstallments(false);
                          }
                        }}
                      />
                      {isCreditAccountSelected && (
                        <p className="text-xs text-muted-foreground">
                          Selecione um cartão vinculado a esta conta.
                        </p>
                      )}
                      {isCreditAccountSelected && filteredCardOptions.length === 0 && (
                        <p className="text-xs text-destructive">
                          Nenhum cartão vinculado à conta selecionada.
                        </p>
                      )}
                    </div>
                  )}
                  {hasSelectedCard && (
                    <div className="space-y-2 md:col-span-2">
                      <p className="text-sm font-medium">Opções do cartão</p>
                      <input type="hidden" name="is_recurring" value={isRecurring ? "true" : "false"} />
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="installments-enabled"
                            checked={showInstallments}
                            onCheckedChange={(value) => setShowInstallments(Boolean(value))}
                          />
                          <Label htmlFor="installments-enabled" className="cursor-pointer">
                            Parcelamento
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="recurrence-enabled"
                            checked={isRecurring}
                            onCheckedChange={(value) => setIsRecurring(Boolean(value))}
                          />
                          <Label htmlFor="recurrence-enabled" className="cursor-pointer">
                            Recorrência
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ative para revelar as configurações específicas do cartão.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" name="notes" placeholder="Algum detalhe extra para lembrar depois?" />
                  </div>
                  {showInstallments && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="installments">Parcelas</Label>
                        <Input id="installments" name="installments" type="number" min={1} placeholder="Ex: 3" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first_installment_on">Primeira parcela</Label>
                        <DatePickerField id="first_installment_on" name="first_installment_on" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.id);
                        return (
                          <div
                            key={tag.id}
                            className={cn(
                              "flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
                              isSelected && "border-primary bg-primary/10 text-primary"
                            )}
                          >
                            <Checkbox
                              id={`tag-${tag.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleTag(tag.id)}
                            />
                            <Label htmlFor={`tag-${tag.id}`} className="cursor-pointer">
                              {tag.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
              {isRecurring && (
                <section className="space-y-4 rounded-xl border bg-card p-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold">Recorrência</h2>
                    <p className="text-xs text-muted-foreground">
                      Configure se o lançamento se repete.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Use recorrência para pagamentos fixos, assinaturas ou aportes periódicos.
                    </div>
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
                        <DatePickerField id="recurrence_end_on" name="recurrence_end_on" />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                Dica: cadastre o essencial primeiro, depois refine nos detalhes se precisar.
              </p>
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
          <DataTable columns={columns} data={transactions} emptyMessage="Nenhuma transação encontrada." />
        </CardContent>
      </Card>
    </div>
  );
}
