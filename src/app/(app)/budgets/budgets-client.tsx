"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { upsertBudgetItem, upsertMonthlyBudget } from "@/app/(app)/budgets/actions";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatCurrencyValue, parseAmount } from "@/lib/finance";

type Category = {
  id: string;
  name: string;
};

type Budget = {
  id: string;
  month: string;
  income_target: number;
  expense_limit: number;
  investment_target: number;
};

type BudgetItem = {
  id: string;
  monthly_budget_id: string;
  category_id: string | null;
  amount_limit: number;
};

type Transaction = {
  amount: number;
  category_id: string | null;
  kind: string;
};

type BudgetsClientProps = {
  month: string;
  categories: Category[];
  budget: Budget | null;
  budgetItems: BudgetItem[];
  transactions: Transaction[];
};

export function BudgetsClient({ month, categories, budget, budgetItems, transactions }: BudgetsClientProps) {
  const router = useRouter();
  const [isSavingCategory, startCategoryTransition] = useTransition();
  const monthValue = month.slice(0, 7);
  const [incomeTargetValue, setIncomeTargetValue] = useState<string>("");
  const [investmentPercentValue, setInvestmentPercentValue] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(monthValue);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories]
  );

  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.kind !== "expense" || !transaction.category_id) return;
      const current = totals.get(transaction.category_id) ?? 0;
      totals.set(transaction.category_id, current + Number(transaction.amount ?? 0));
    });
    return totals;
  }, [transactions]);
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const currentItems = budget
    ? budgetItems.filter((item) => item.monthly_budget_id === budget.id)
    : [];

  const investmentPercent = useMemo(() => {
    if (!investmentPercentValue) return 0;
    const normalized = investmentPercentValue.replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 100);
  }, [investmentPercentValue]);

  const incomeTargetAmount = useMemo(
    () => parseAmount(incomeTargetValue),
    [incomeTargetValue]
  );

  const investmentTargetAmount = useMemo(
    () => incomeTargetAmount * (investmentPercent / 100),
    [incomeTargetAmount, investmentPercent]
  );

  const expenseLimitAmount = useMemo(
    () => Math.max(incomeTargetAmount - investmentTargetAmount, 0),
    [incomeTargetAmount, investmentTargetAmount]
  );

  useEffect(() => {
    setIncomeTargetValue(formatCurrencyValue(budget?.income_target ?? ""));
    const incomeTarget = Number(budget?.income_target ?? 0);
    const investmentTarget = Number(budget?.investment_target ?? 0);
    if (!incomeTarget) {
      setInvestmentPercentValue("");
      return;
    }
    const percent = (investmentTarget / incomeTarget) * 100;
    if (!Number.isFinite(percent) || percent <= 0) {
      setInvestmentPercentValue("0");
      return;
    }
    setInvestmentPercentValue(percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2));
  }, [budget?.income_target, budget?.investment_target]);

  useEffect(() => {
    setSelectedMonth(monthValue);
  }, [monthValue]);

  const columns = useMemo<ColumnDef<BudgetItem>[]>(
    () => [
      {
        id: "category",
        header: "Categoria",
        cell: ({ row }) =>
          row.original.category_id
            ? categoryNameById.get(row.original.category_id)
            : "-",
      },
      {
        accessorKey: "amount_limit",
        header: "Limite",
        cell: ({ row }) => formatCurrency(row.original.amount_limit ?? 0),
      },
      {
        id: "spent",
        header: "Gasto",
        cell: ({ row }) => {
          const spent = row.original.category_id
            ? expenseByCategory.get(row.original.category_id) ?? 0
            : 0;
          return formatCurrency(spent);
        },
      },
      {
        id: "available",
        header: "Disponível",
        cell: ({ row }) => {
          const spent = row.original.category_id
            ? expenseByCategory.get(row.original.category_id) ?? 0
            : 0;
          const available = Number(row.original.amount_limit ?? 0) - spent;
          return formatCurrency(available);
        },
      },
    ],
    [categoryNameById, expenseByCategory]
  );

  const handleUpsertBudgetItem = (formData: FormData) => {
    startCategoryTransition(async () => {
      await upsertBudgetItem(formData);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orçamentos</h1>
        <p className="text-sm">Defina metas mensais e acompanhe o comprometimento.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Orçamento do mês</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" action={upsertMonthlyBudget}>
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <Input
                id="month"
                name="month"
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  const nextMonth = event.target.value;
                  setSelectedMonth(nextMonth);
                  if (nextMonth) {
                    router.push(`/budgets?month=${nextMonth}`);
                  }
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income_target">Meta de receita</Label>
              <CurrencyInput
                id="income_target"
                name="income_target"
                value={incomeTargetValue}
                onValueChange={setIncomeTargetValue}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investment_percent">Meta de investimento (%)</Label>
              <Input
                id="investment_percent"
                name="investment_percent"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={investmentPercentValue}
                onChange={(event) => setInvestmentPercentValue(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_limit_display">Limite de despesa</Label>
              <Input
                id="expense_limit_display"
                value={formatCurrencyValue(expenseLimitAmount)}
                readOnly
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Salvar metas</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Orçamento por categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-3" action={handleUpsertBudgetItem}>
            <input type="hidden" name="month" value={monthValue} />
            <SelectField name="category_id" label="Categoria" options={categoryOptions} />
            <div className="space-y-2">
              <Label htmlFor="amount_limit">Limite</Label>
              <CurrencyInput id="amount_limit" name="amount_limit" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={isSavingCategory}>
                {isSavingCategory ? "Salvando..." : "Salvar limite"}
              </Button>
            </div>
          </form>
          <DataTable columns={columns} data={currentItems} emptyMessage="Nenhum orçamento encontrado." />
        </CardContent>
      </Card>
    </div>
  );
}
