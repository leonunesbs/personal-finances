"use client";

import { useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  createAccount,
  createCard,
  createCardPayment,
  createCategory,
  createTag,
  deleteCategory,
  deleteCard,
  updateCard,
  updateCategory,
} from "@/app/(app)/settings/actions";
import { CurrencyInput } from "@/components/forms/currency-input";
import { DatePickerField } from "@/components/forms/date-picker-field";
import { SelectField } from "@/components/forms/select-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BinInfo } from "@/lib/bin-info";
import {
  formatCurrency,
  formatCurrencyValue,
  getStatementDueDate,
  getStatementWindow,
  parseAmount,
  toDateString,
  type CurrencyCode,
} from "@/lib/finance";

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
  first6: string | null;
  last4: string | null;
  closing_day: number;
  due_day: number;
  limit_amount: number;
  binInfo?: BinInfo | null;
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

const accountTypeValues = ["checking", "savings", "cash", "credit", "investment"] as const;
const currencyValues = ["BRL", "USD", "EUR"] as const;

const currencySchema = z
  .string()
  .optional()
  .refine((value) => {
    if (!value) return true;
    return parseAmount(value) >= 0;
  }, "Valor inválido");

const accountSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  type: z.enum(accountTypeValues),
  currency: z.enum(currencyValues),
  initial_balance: currencySchema,
});

const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
});

const cardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  account_id: z.string().optional(),
  card_number: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{10,19}$/.test(value), "Informe o número completo"),
  closing_day: z.coerce.number().int().min(1, "Informe o dia").max(31, "Dia inválido"),
  due_day: z.coerce.number().int().min(1, "Informe o dia").max(31, "Dia inválido"),
  limit_amount: currencySchema,
});

const cardEditSchema = z.object({
  closing_day: z.coerce.number().int().min(1, "Informe o dia").max(31, "Dia inválido"),
  due_day: z.coerce.number().int().min(1, "Informe o dia").max(31, "Dia inválido"),
  limit_amount: currencySchema,
});

const cardPaymentSchema = z.object({
  card_id: z.string().min(1, "Selecione o cartão"),
  account_id: z.string().min(1, "Selecione a conta"),
  amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((value) => parseAmount(value) > 0, "Informe um valor maior que zero"),
  occurred_on: z.string().min(1, "Informe a data"),
});

const tagSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;
type CardFormValues = z.infer<typeof cardSchema>;
type CardEditFormValues = z.infer<typeof cardEditSchema>;
type CardPaymentFormValues = z.infer<typeof cardPaymentSchema>;
type TagFormValues = z.infer<typeof tagSchema>;

export function SettingsClient({
  accounts,
  categories,
  cards,
  tags,
  transactions,
}: SettingsClientProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isCategoryPending, startCategoryTransition] = useTransition();
  const [isCardPending, startCardTransition] = useTransition();
  const todayLabel = toDateString(new Date());
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      currency: "BRL",
      initial_balance: "",
    },
  });
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });
  const categoryEditForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });
  const cardForm = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      account_id: "",
      card_number: "",
      closing_day: "",
      due_day: "",
      limit_amount: "",
    },
  });
  const cardEditForm = useForm<CardEditFormValues>({
    resolver: zodResolver(cardEditSchema),
    defaultValues: {
      closing_day: "",
      due_day: "",
      limit_amount: "",
    },
  });
  const cardPaymentForm = useForm<CardPaymentFormValues>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: {
      card_id: "",
      account_id: "",
      amount: "",
      occurred_on: todayLabel,
    },
  });
  const tagForm = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
    },
  });
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]));
  const cardOptions = cards.map((card) => ({ value: card.id, label: card.name }));
  const cashAccountOptions = accounts
    .filter((account) => account.type !== "credit")
    .map((account) => ({ value: account.id, label: account.name }));
  const editingCategoryName = categoryEditForm.watch("name");
  const currentBalanceByAccount = new Map<string, number>();
  const cardTransactionCount = new Map<string, number>();

  const buildFormData = (values: Record<string, string | undefined>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.set(key, value ?? "");
    });
    return formData;
  };

  const handleAccountSubmit = accountForm.handleSubmit(async (values) => {
    const formData = buildFormData({
      name: values.name,
      type: values.type,
      currency: values.currency,
      initial_balance: values.initial_balance,
    });
    await createAccount(formData);
    accountForm.reset({
      name: "",
      type: "checking",
      currency: "BRL",
      initial_balance: "",
    });
  });

  const handleCategorySubmit = categoryForm.handleSubmit(async (values) => {
    const formData = buildFormData({
      name: values.name,
    });
    await createCategory(formData);
    categoryForm.reset({ name: "" });
  });

  const handleCardSubmit = cardForm.handleSubmit(async (values) => {
    const formData = buildFormData({
      name: values.name,
      account_id: values.account_id,
      card_number: values.card_number,
      closing_day: values.closing_day,
      due_day: values.due_day,
      limit_amount: values.limit_amount,
    });
    await createCard(formData);
    cardForm.reset({
      name: "",
      account_id: "",
      card_number: "",
      closing_day: "",
      due_day: "",
      limit_amount: "",
    });
  });

  const handleCardEditSubmit = cardEditForm.handleSubmit(async (values) => {
    if (!editingCardId) return;
    await updateCard({
      id: editingCardId,
      closing_day: values.closing_day,
      due_day: values.due_day,
      limit_amount: parseAmount(values.limit_amount ?? ""),
    });
    setEditingCardId(null);
    cardEditForm.reset({
      closing_day: "",
      due_day: "",
      limit_amount: "",
    });
  });

  const handleCardPaymentSubmit = cardPaymentForm.handleSubmit(async (values) => {
    const formData = buildFormData({
      card_id: values.card_id,
      account_id: values.account_id,
      amount: values.amount,
      occurred_on: values.occurred_on,
    });
    await createCardPayment(formData);
    cardPaymentForm.reset({
      card_id: "",
      account_id: "",
      amount: "",
      occurred_on: todayLabel,
    });
  });

  const handleTagSubmit = tagForm.handleSubmit(async (values) => {
    const formData = buildFormData({
      name: values.name,
    });
    await createTag(formData);
    tagForm.reset({ name: "" });
  });

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
  transactions.forEach((transaction) => {
    if (!transaction.card_id) return;
    const current = cardTransactionCount.get(transaction.card_id) ?? 0;
    cardTransactionCount.set(transaction.card_id, current + 1);
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
      cell: ({ row }) => {
        const isEditing = editingCategoryId === row.original.id;

        if (!isEditing) {
          return row.original.name;
        }

        return (
          <div className="space-y-1">
            <Input
              {...categoryEditForm.register("name")}
              className="max-w-[240px]"
              autoFocus
            />
            {categoryEditForm.formState.errors.name && (
              <p className="text-sm text-destructive">
                {categoryEditForm.formState.errors.name.message}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const isEditing = editingCategoryId === row.original.id;
        const trimmedName = (editingCategoryName ?? "").trim();
        const hasChanges = trimmedName.length > 0 && trimmedName !== row.original.name;

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isCategoryPending || !hasChanges}
                onClick={() => {
                  startCategoryTransition(async () => {
                    const result = await categoryEditForm.trigger();
                    if (!result) return;
                    await updateCategory({ id: row.original.id, name: trimmedName });
                    setEditingCategoryId(null);
                    categoryEditForm.reset({ name: "" });
                  });
                }}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCategoryPending}
                onClick={() => {
                  setEditingCategoryId(null);
                  categoryEditForm.reset({ name: "" });
                }}
              >
                Cancelar
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCategoryId(row.original.id);
                categoryEditForm.reset({ name: row.original.name });
              }}
            >
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={isCategoryPending}>
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {`Excluir a categoria "${row.original.name}"? Lançamentos e orçamentos ficarão sem categoria.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isCategoryPending}
                    onClick={() => {
                      startCategoryTransition(async () => {
                        await deleteCategory(row.original.id);
                        if (editingCategoryId === row.original.id) {
                          setEditingCategoryId(null);
                          categoryEditForm.reset({ name: "" });
                        }
                      });
                    }}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  const cardColumns: ColumnDef<CardItem>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => row.original.name,
    },
    {
      id: "digits",
      header: "Dígitos",
      cell: ({ row }) => {
        const { first6, last4 } = row.original;
        if (!first6 || !last4) return "-";
        return `${first6} **** ${last4}`;
      },
    },
    {
      id: "brand",
      header: "Bandeira/Banco",
      cell: ({ row }) => {
        const { binInfo, first6 } = row.original;
        const label = [binInfo?.cardType, binInfo?.issuer].filter(Boolean).join(" • ");
        if (label) return label;
        return first6 ? `BIN ${first6}` : "-";
      },
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
      cell: ({ row }) => {
        const isEditing = editingCardId === row.original.id;
        if (!isEditing) return row.original.closing_day;
        return (
          <div className="space-y-1">
            <Input
              type="number"
              min={1}
              max={31}
              className="w-24"
              {...cardEditForm.register("closing_day")}
            />
            {cardEditForm.formState.errors.closing_day && (
              <p className="text-xs text-destructive">
                {cardEditForm.formState.errors.closing_day.message}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "due_day",
      header: "Vencimento",
      cell: ({ row }) => {
        const isEditing = editingCardId === row.original.id;
        if (!isEditing) return row.original.due_day;
        return (
          <div className="space-y-1">
            <Input
              type="number"
              min={1}
              max={31}
              className="w-24"
              {...cardEditForm.register("due_day")}
            />
            {cardEditForm.formState.errors.due_day && (
              <p className="text-xs text-destructive">
                {cardEditForm.formState.errors.due_day.message}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "limit_amount",
      header: "Limite",
      cell: ({ row }) => {
        const isEditing = editingCardId === row.original.id;
        if (!isEditing) return formatCurrency(row.original.limit_amount);
        return (
          <div className="space-y-1">
            <Controller
              control={cardEditForm.control}
              name="limit_amount"
              render={({ field }) => (
                <CurrencyInput
                  className="w-32"
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                />
              )}
            />
            {cardEditForm.formState.errors.limit_amount && (
              <p className="text-xs text-destructive">
                {cardEditForm.formState.errors.limit_amount.message}
              </p>
            )}
          </div>
        );
      },
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
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const isEditing = editingCardId === row.original.id;
        const hasTransactions = (cardTransactionCount.get(row.original.id) ?? 0) > 0;
        const blockedMessage = `Não é possível excluir o cartão "${row.original.name}" porque há lançamentos vinculados.`;

        if (isEditing) {
          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isCardPending}
                onClick={() => {
                  startCardTransition(async () => {
                    await handleCardEditSubmit();
                  });
                }}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCardPending}
                onClick={() => {
                  setEditingCardId(null);
                  cardEditForm.reset({
                    closing_day: "",
                    due_day: "",
                    limit_amount: "",
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCardId(row.original.id);
                cardEditForm.reset({
                  closing_day: row.original.closing_day,
                  due_day: row.original.due_day,
                  limit_amount: formatCurrencyValue(row.original.limit_amount),
                });
              }}
            >
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {hasTransactions ? "Exclusão bloqueada" : "Excluir cartão"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {hasTransactions
                      ? blockedMessage
                      : `Tem certeza que deseja excluir o cartão "${row.original.name}"?`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{hasTransactions ? "Entendi" : "Cancelar"}</AlertDialogCancel>
                  {!hasTransactions && (
                    <AlertDialogAction
                      disabled={isCardPending}
                      onClick={() => {
                        startCardTransition(async () => {
                          await deleteCard(row.original.id);
                        });
                      }}
                    >
                      Excluir
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
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
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAccountSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Nome</Label>
                  <Input id="account-name" {...accountForm.register("name")} />
                  {accountForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{accountForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Controller
                    control={accountForm.control}
                    name="type"
                    render={({ field }) => (
                      <SelectField
                        name="type"
                        label="Tipo"
                        options={accountTypeOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                  {accountForm.formState.errors.type && (
                    <p className="text-sm text-destructive">{accountForm.formState.errors.type.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Controller
                    control={accountForm.control}
                    name="currency"
                    render={({ field }) => (
                      <SelectField
                        name="currency"
                        label="Moeda"
                        options={currencyOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                  {accountForm.formState.errors.currency && (
                    <p className="text-sm text-destructive">{accountForm.formState.errors.currency.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-initial">Saldo inicial</Label>
                  <Controller
                    control={accountForm.control}
                    name="initial_balance"
                    render={({ field }) => (
                      <CurrencyInput
                        id="account-initial"
                        name="initial_balance"
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                  {accountForm.formState.errors.initial_balance && (
                    <p className="text-sm text-destructive">
                      {accountForm.formState.errors.initial_balance.message}
                    </p>
                  )}
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
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCategorySubmit}>
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nome</Label>
                  <Input id="category-name" {...categoryForm.register("name")} />
                  {categoryForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
                  )}
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
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCardSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="card-name">Nome</Label>
                  <Input id="card-name" {...cardForm.register("name")} />
                  {cardForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{cardForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Controller
                    control={cardForm.control}
                    name="account_id"
                    render={({ field }) => (
                      <SelectField
                        name="account_id"
                        label="Conta vinculada"
                        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
                        placeholder="Opcional"
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                  {cardForm.formState.errors.account_id && (
                    <p className="text-sm text-destructive">{cardForm.formState.errors.account_id.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-number">Número do cartão</Label>
                  <Input
                    id="card-number"
                    inputMode="numeric"
                    maxLength={19}
                    placeholder="Somente números"
                    {...cardForm.register("card_number")}
                  />
                  {cardForm.formState.errors.card_number && (
                    <p className="text-sm text-destructive">
                      {cardForm.formState.errors.card_number.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-closing">Dia de fechamento</Label>
                  <Input
                    id="card-closing"
                    type="number"
                    min={1}
                    max={31}
                    {...cardForm.register("closing_day")}
                  />
                  {cardForm.formState.errors.closing_day && (
                    <p className="text-sm text-destructive">{cardForm.formState.errors.closing_day.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-due">Dia de vencimento</Label>
                  <Input id="card-due" type="number" min={1} max={31} {...cardForm.register("due_day")} />
                  {cardForm.formState.errors.due_day && (
                    <p className="text-sm text-destructive">{cardForm.formState.errors.due_day.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-limit">Limite</Label>
                  <Controller
                    control={cardForm.control}
                    name="limit_amount"
                    render={({ field }) => (
                      <CurrencyInput
                        id="card-limit"
                        name="limit_amount"
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                  {cardForm.formState.errors.limit_amount && (
                    <p className="text-sm text-destructive">{cardForm.formState.errors.limit_amount.message}</p>
                  )}
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
                <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleCardPaymentSubmit}>
                  <div className="space-y-2">
                    <Controller
                      control={cardPaymentForm.control}
                      name="card_id"
                      render={({ field }) => (
                        <SelectField
                          name="card_id"
                          label="Cartão"
                          options={cardOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                    {cardPaymentForm.formState.errors.card_id && (
                      <p className="text-sm text-destructive">
                        {cardPaymentForm.formState.errors.card_id.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Controller
                      control={cardPaymentForm.control}
                      name="account_id"
                      render={({ field }) => (
                        <SelectField
                          name="account_id"
                          label="Conta de pagamento"
                          options={cashAccountOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                    {cardPaymentForm.formState.errors.account_id && (
                      <p className="text-sm text-destructive">
                        {cardPaymentForm.formState.errors.account_id.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-payment-amount">Valor</Label>
                    <Controller
                      control={cardPaymentForm.control}
                      name="amount"
                      render={({ field }) => (
                        <CurrencyInput
                          id="card-payment-amount"
                          name="amount"
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                    {cardPaymentForm.formState.errors.amount && (
                      <p className="text-sm text-destructive">
                        {cardPaymentForm.formState.errors.amount.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-payment-date">Data</Label>
                    <Controller
                      control={cardPaymentForm.control}
                      name="occurred_on"
                      render={({ field }) => (
                        <DatePickerField
                          id="card-payment-date"
                          name="occurred_on"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                    {cardPaymentForm.formState.errors.occurred_on && (
                      <p className="text-sm text-destructive">
                        {cardPaymentForm.formState.errors.occurred_on.message}
                      </p>
                    )}
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
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleTagSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="tag-name">Nome</Label>
                  <Input id="tag-name" {...tagForm.register("name")} />
                  {tagForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{tagForm.formState.errors.name.message}</p>
                  )}
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
