"use client";

import { useMemo } from "react";

import { upsertBudgetItem, upsertMonthlyBudget } from "@/app/(app)/budgets/actions";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const monthValue = month.slice(0, 7);

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

  const currentItems = budget
    ? budgetItems.filter((item) => item.monthly_budget_id === budget.id)
    : [];

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
              <Input id="month" name="month" type="month" defaultValue={monthValue} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income_target">Meta de receita</Label>
              <CurrencyInput id="income_target" name="income_target" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_limit">Limite de despesa</Label>
              <CurrencyInput id="expense_limit" name="expense_limit" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investment_target">Meta de investimento</Label>
              <CurrencyInput id="investment_target" name="investment_target" />
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
          <form className="grid gap-4 md:grid-cols-3" action={upsertBudgetItem}>
            <input type="hidden" name="month" value={monthValue} />
            <SelectField name="category_id" label="Categoria" options={categoryOptions} />
            <div className="space-y-2">
              <Label htmlFor="amount_limit">Limite</Label>
              <CurrencyInput id="amount_limit" name="amount_limit" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Salvar limite</Button>
            </div>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Gasto</TableHead>
                <TableHead>Disponível</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((item) => {
                const spent = item.category_id ? expenseByCategory.get(item.category_id) ?? 0 : 0;
                const available = Number(item.amount_limit ?? 0) - spent;
                const categoryName = categories.find((category) => category.id === item.category_id)?.name ?? "-";
                return (
                  <TableRow key={item.id}>
                    <TableCell>{categoryName}</TableCell>
                    <TableCell>{Number(item.amount_limit ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{spent.toFixed(2)}</TableCell>
                    <TableCell>{available.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
