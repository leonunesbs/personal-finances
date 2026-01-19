'use client';

import { useEffect, useMemo, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pie, PieChart } from 'recharts';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { copyPreviousMonthBudgetItems, upsertBudgetItems, upsertMonthlyBudget } from '@/app/(app)/budgets/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatCurrencyValue, parseAmount } from '@/lib/finance';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/forms/currency-input';
import { SelectField } from '@/components/forms/select-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { zodResolver } from '@hookform/resolvers/zod';

import type { ChartConfig } from '@/components/ui/chart';

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
  reserve_target: number;
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
  canCopyPrevious: boolean;
  yearBudgets: Budget[];
};

const budgetFormSchema = z.object({
  month: z.string().min(1, 'Selecione o mês.'),
  income_target: z
    .string()
    .optional()
    .refine((value) => !value || parseAmount(value) >= 0, 'Informe um valor válido.'),
  investment_percent: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      const normalized = value.replace(',', '.').replace(/[^0-9.-]/g, '');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
    }, 'Percentual inválido.'),
  reserve_percent: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      const normalized = value.replace(',', '.').replace(/[^0-9.-]/g, '');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
    }, 'Percentual inválido.'),
  limits: z.record(
    z.string(),
    z
      .string()
      .optional()
      .refine((value) => !value || parseAmount(value) >= 0, 'Informe um valor válido.'),
  ),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

const parsePercent = (value?: string) => {
  if (!value) return 0;
  const normalized = value.replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 100);
};

const normalizePercentPair = (investment: number, reserve: number) => {
  const safeInvestment = Math.min(Math.max(investment, 0), 100);
  const safeReserve = Math.min(Math.max(reserve, 0), 100);
  const total = safeInvestment + safeReserve;
  if (total <= 100 || total === 0) {
    return { investment: safeInvestment, reserve: safeReserve };
  }
  const factor = 100 / total;
  return {
    investment: Math.round(safeInvestment * factor),
    reserve: Math.round(safeReserve * factor),
  };
};

const toInvestmentPercentLabel = (budget: Budget | null) => {
  const incomeTarget = Number(budget?.income_target ?? 0);
  const investmentTarget = Number(budget?.investment_target ?? 0);
  if (!incomeTarget) return '';
  const percent = (investmentTarget / incomeTarget) * 100;
  if (!Number.isFinite(percent) || percent <= 0) return '0';
  return percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2);
};

const toReservePercentLabel = (budget: Budget | null) => {
  const incomeTarget = Number(budget?.income_target ?? 0);
  const reserveTarget = Number(budget?.reserve_target ?? 0);
  if (!incomeTarget) return '';
  const percent = (reserveTarget / incomeTarget) * 100;
  if (!Number.isFinite(percent) || percent <= 0) return '0';
  return percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2);
};

const chartConfig = {
  investment: {
    label: 'Investimento',
    color: '#3b82f6',
  },
  reserve: {
    label: 'Reserva',
    color: '#ef4444',
  },
  expense: {
    label: 'Despesa',
    color: '#22c55e',
  },
} satisfies ChartConfig;

export function BudgetsClient({
  month,
  categories,
  budget,
  budgetItems,
  transactions,
  canCopyPrevious,
  yearBudgets,
}: BudgetsClientProps) {
  const router = useRouter();
  const [isSavingBudget, startBudgetTransition] = useTransition();
  const [isCopying, startCopyTransition] = useTransition();
  const [isChangingMonth, startMonthTransition] = useTransition();
  const monthValue = month.slice(0, 7);
  const budgetResolver = useMemo(() => zodResolver(budgetFormSchema), []);

  const budgetForm = useForm<BudgetFormValues>({
    resolver: budgetResolver,
    defaultValues: {
      month: monthValue,
      income_target: formatCurrencyValue(budget?.income_target ?? ''),
      investment_percent: toInvestmentPercentLabel(budget) || '20',
      reserve_percent: toReservePercentLabel(budget) || '5',
      limits: {},
    },
  });

  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.kind !== 'expense' || !transaction.category_id) return;
      const current = totals.get(transaction.category_id) ?? 0;
      totals.set(transaction.category_id, current + Number(transaction.amount ?? 0));
    });
    return totals;
  }, [transactions]);
  const currentItems = budget ? budgetItems : [];
  const budgetItemByCategory = useMemo(
    () =>
      new Map(
        currentItems.filter((item) => Boolean(item.category_id)).map((item) => [item.category_id as string, item]),
      ),
    [currentItems],
  );

  const incomeTargetValue =
    useWatch({
      control: budgetForm.control,
      name: 'income_target',
    }) ?? '';
  const investmentPercentValue =
    useWatch({
      control: budgetForm.control,
      name: 'investment_percent',
    }) ?? '';
  const reservePercentValue =
    useWatch({
      control: budgetForm.control,
      name: 'reserve_percent',
    }) ?? '';
  const selectedMonth =
    useWatch({
      control: budgetForm.control,
      name: 'month',
    }) ?? '';
  const limitValues = (useWatch({
    control: budgetForm.control,
    name: 'limits',
  }) ?? {}) as Record<string, string | undefined>;
  const nearLimitThreshold = 0.8;

  const investmentPercent = useMemo(() => parsePercent(investmentPercentValue), [investmentPercentValue]);
  const reservePercent = useMemo(() => parsePercent(reservePercentValue), [reservePercentValue]);

  const incomeTargetAmount = useMemo(() => parseAmount(incomeTargetValue), [incomeTargetValue]);

  const investmentTargetAmount = useMemo(
    () => incomeTargetAmount * (investmentPercent / 100),
    [incomeTargetAmount, investmentPercent],
  );

  const reserveTargetAmount = useMemo(
    () => incomeTargetAmount * (reservePercent / 100),
    [incomeTargetAmount, reservePercent],
  );

  const expenseLimitAmount = useMemo(
    () => Math.max(incomeTargetAmount - investmentTargetAmount - reserveTargetAmount, 0),
    [incomeTargetAmount, investmentTargetAmount, reserveTargetAmount],
  );

  const categoryTotals = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        const limitAmount = parseAmount(limitValues?.[category.id] ?? '');
        const spent = expenseByCategory.get(category.id) ?? 0;
        acc.limit += limitAmount;
        acc.spent += spent;
        acc.available += limitAmount - spent;
        return acc;
      },
      { limit: 0, spent: 0, available: 0 },
    );
  }, [categories, expenseByCategory, limitValues]);

  const getBudgetFormValues = (targetMonth: string) => {
    const nextLimits = categories.reduce<Record<string, string>>((acc, category) => {
      const currentItem = budgetItemByCategory.get(category.id);
      acc[category.id] = formatCurrencyValue(currentItem?.amount_limit ?? '');
      return acc;
    }, {});
    return {
      month: targetMonth,
      income_target: formatCurrencyValue(budget?.income_target ?? ''),
      investment_percent: toInvestmentPercentLabel(budget) || '20',
      reserve_percent: toReservePercentLabel(budget) || '5',
      limits: nextLimits,
    };
  };

  useEffect(() => {
    if (monthValue !== selectedMonth) {
      return;
    }
    budgetForm.reset(getBudgetFormValues(monthValue));
  }, [
    budget?.income_target,
    budget?.investment_target,
    budget?.reserve_target,
    budgetItemByCategory,
    categories,
    monthValue,
    budgetForm,
    selectedMonth,
  ]);

  const handleMonthChange = (nextMonth: string, shouldNavigate = true) => {
    if (!nextMonth || nextMonth === selectedMonth) {
      return;
    }
    budgetForm.setValue('month', nextMonth, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (nextMonth && shouldNavigate) {
      startMonthTransition(() => {
        router.push(`/budgets?month=${nextMonth}`, { scroll: false });
      });
    }
  };

  const handleSaveBudget = budgetForm.handleSubmit(async (values) => {
    startBudgetTransition(async () => {
      const monthlyData = new FormData();
      monthlyData.set('month', values.month);
      monthlyData.set('income_target', values.income_target ?? '');
      monthlyData.set('investment_percent', values.investment_percent ?? '');
      monthlyData.set('reserve_percent', values.reserve_percent ?? '');

      const itemsData = new FormData();
      itemsData.set('month', values.month);
      itemsData.set(
        'items',
        JSON.stringify(
          categories.map((category) => ({
            category_id: category.id,
            amount_limit: values.limits?.[category.id] ?? '',
          })),
        ),
      );

      await upsertMonthlyBudget(monthlyData);
      await upsertBudgetItems(itemsData);
      router.refresh();
    });
  });

  const formatMonthLabel = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    const label = parsed.toLocaleDateString('pt-BR', { month: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 12 }, (_, index) => currentYear + 1 - index);
  const fallbackMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [resolvedYear, resolvedMonth] = selectedMonth.split('-');
  const selectedYearValue = resolvedYear || String(currentYear);
  const selectedMonthValue = resolvedMonth || fallbackMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orçamentos</h1>
        <p className="text-sm">Defina metas mensais e acompanhe o comprometimento.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Orçamento do mês e por categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-6" onSubmit={handleSaveBudget}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Controller
                  control={budgetForm.control}
                  name="month"
                  render={() => (
                    <SelectField
                      name="category_year"
                      label="Ano de referência"
                      options={yearOptions.map((year) => ({
                        value: String(year),
                        label: String(year),
                      }))}
                      value={selectedYearValue}
                      disabled={isChangingMonth}
                      onValueChange={(value) => {
                        const nextMonth = `${value}-${selectedMonthValue}`;
                        handleMonthChange(nextMonth);
                      }}
                    />
                  )}
                />
                {budgetForm.formState.errors.month ? (
                  <p className="text-sm text-destructive">{budgetForm.formState.errors.month.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mês de referência</Label>
                  {isChangingMonth ? <span className="text-xs text-muted-foreground">Carregando...</span> : null}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-busy={isChangingMonth}>
                  {[
                    { value: '01', label: 'JAN' },
                    { value: '02', label: 'FEV' },
                    { value: '03', label: 'MAR' },
                    { value: '04', label: 'ABR' },
                    { value: '05', label: 'MAI' },
                    { value: '06', label: 'JUN' },
                    { value: '07', label: 'JUL' },
                    { value: '08', label: 'AGO' },
                    { value: '09', label: 'SET' },
                    { value: '10', label: 'OUT' },
                    { value: '11', label: 'NOV' },
                    { value: '12', label: 'DEZ' },
                  ].map((monthOption) => {
                    const isChecked = selectedMonthValue === monthOption.value;
                    const nextMonth = `${selectedYearValue}-${monthOption.value}`;

                    return (
                      <div key={monthOption.value} className="flex items-center">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isChecked}
                          disabled={isChangingMonth}
                          onClick={() => handleMonthChange(nextMonth)}
                          className={cn(
                            'flex w-full items-center justify-center rounded-md border border-input px-3 py-2 text-sm font-medium transition-colors',
                            isChecked ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground',
                            isChangingMonth && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          {monthOption.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="income_target">Meta de receita</Label>
                <Controller
                  control={budgetForm.control}
                  name="income_target"
                  render={({ field }) => (
                    <CurrencyInput
                      id="income_target"
                      name="income_target"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {budgetForm.formState.errors.income_target ? (
                  <p className="text-sm text-destructive">{budgetForm.formState.errors.income_target.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="investment_percent">Meta de investimento (%)</Label>
                <Controller
                  control={budgetForm.control}
                  name="investment_percent"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Slider
                        id="investment_percent"
                        min={0}
                        max={100}
                        step={1}
                        value={[investmentPercent]}
                        onValueChange={(values) => {
                          const nextInvestment = values[0] ?? 0;
                          // #region agent log
                          fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              sessionId: 'debug-session',
                              runId: 'pre-fix',
                              hypothesisId: 'H1',
                              location: 'budgets-client.tsx:155',
                              message: 'investment slider change',
                              data: { nextInvestment, currentReserve: reservePercent },
                              timestamp: Date.now(),
                            }),
                          }).catch(() => {});
                          // #endregion
                          const normalized = normalizePercentPair(nextInvestment, reservePercent);
                          // #region agent log
                          fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              sessionId: 'debug-session',
                              runId: 'pre-fix',
                              hypothesisId: 'H2',
                              location: 'budgets-client.tsx:166',
                              message: 'investment normalized',
                              data: { nextInvestment, normalized },
                              timestamp: Date.now(),
                            }),
                          }).catch(() => {});
                          // #endregion
                          field.onChange(String(normalized.investment));
                          budgetForm.setValue('reserve_percent', String(normalized.reserve), {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                      <div className="text-sm text-muted-foreground">{investmentPercent}%</div>
                    </div>
                  )}
                />
                {budgetForm.formState.errors.investment_percent ? (
                  <p className="text-sm text-destructive">{budgetForm.formState.errors.investment_percent.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reserve_percent">Reserva crítica (%)</Label>
                <Controller
                  control={budgetForm.control}
                  name="reserve_percent"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Slider
                        id="reserve_percent"
                        min={0}
                        max={100}
                        step={1}
                        value={[reservePercent]}
                        onValueChange={(values) => {
                          const nextReserve = values[0] ?? 0;
                          // #region agent log
                          fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              sessionId: 'debug-session',
                              runId: 'pre-fix',
                              hypothesisId: 'H1',
                              location: 'budgets-client.tsx:195',
                              message: 'reserve slider change',
                              data: { nextReserve, currentInvestment: investmentPercent },
                              timestamp: Date.now(),
                            }),
                          }).catch(() => {});
                          // #endregion
                          const normalized = normalizePercentPair(investmentPercent, nextReserve);
                          // #region agent log
                          fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              sessionId: 'debug-session',
                              runId: 'pre-fix',
                              hypothesisId: 'H2',
                              location: 'budgets-client.tsx:206',
                              message: 'reserve normalized',
                              data: { nextReserve, normalized },
                              timestamp: Date.now(),
                            }),
                          }).catch(() => {});
                          // #endregion
                          field.onChange(String(normalized.reserve));
                          budgetForm.setValue('investment_percent', String(normalized.investment), {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      />
                      <div className="text-sm text-muted-foreground">{reservePercent}%</div>
                    </div>
                  )}
                />
                {budgetForm.formState.errors.reserve_percent ? (
                  <p className="text-sm text-destructive">{budgetForm.formState.errors.reserve_percent.message}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Meta de investimento (valor)</p>
                  <p className="mt-2 text-lg font-semibold text-blue-600">
                    {formatCurrency(investmentTargetAmount, 'BRL')}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Reserva crítica (valor)</p>
                  <p className="mt-2 text-lg font-semibold text-red-600">
                    {formatCurrency(reserveTargetAmount, 'BRL')}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Limite de despesa</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-600">
                    {formatCurrency(expenseLimitAmount, 'BRL')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ChartContainer config={chartConfig} className="aspect-square w-full max-w-[180px]">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          label: 'Investimento',
                          value: investmentTargetAmount,
                          fill: 'var(--color-investment)',
                        },
                        {
                          label: 'Reserva',
                          value: reserveTargetAmount,
                          fill: 'var(--color-reserve)',
                        },
                        {
                          label: 'Despesa',
                          value: expenseLimitAmount,
                          fill: 'var(--color-expense)',
                        },
                      ]}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={40}
                      outerRadius={70}
                    />
                    <ChartLegend
                      content={<ChartLegendContent nameKey="label" />}
                      className="mt-3 flex flex-wrap justify-center gap-2 text-xs"
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            </div>
            <div className="rounded-md border">
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
                  {categories.length > 0 ? (
                    categories.map((category) => {
                      const spent = expenseByCategory.get(category.id) ?? 0;
                      const limitValue = limitValues?.[category.id] ?? '';
                      const limitAmount = parseAmount(limitValue);
                      const available = limitAmount - spent;
                      const hasLimit = limitAmount > 0;
                      const spentRatio = hasLimit ? spent / limitAmount : 0;
                      const rowClassName = cn(
                        hasLimit && spent > limitAmount && 'bg-destructive/10',
                        hasLimit && spent <= limitAmount && spentRatio >= nearLimitThreshold && 'bg-amber-500/10',
                        hasLimit && spentRatio < nearLimitThreshold && 'bg-emerald-500/10',
                      );
                      const limitErrors = budgetForm.formState.errors.limits as
                        | Record<string, { message?: string }>
                        | undefined;
                      const limitError = limitErrors?.[category.id]?.message;
                      const limitFieldName = `limits.${category.id}` as `limits.${string}`;

                      return (
                        <TableRow key={category.id} className={rowClassName}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Controller
                                control={budgetForm.control}
                                name={limitFieldName}
                                render={({ field }) => (
                                  <CurrencyInput
                                    id={`limit-${category.id}`}
                                    name={limitFieldName}
                                    value={typeof field.value === 'string' ? field.value : ''}
                                    onValueChange={field.onChange}
                                  />
                                )}
                              />
                              {limitError ? <p className="text-xs text-destructive">{limitError}</p> : null}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              hasLimit && spent > limitAmount && 'font-semibold text-destructive',
                              hasLimit &&
                                spent <= limitAmount &&
                                spentRatio >= nearLimitThreshold &&
                                'font-semibold text-amber-600',
                              hasLimit && spentRatio < nearLimitThreshold && 'font-semibold text-emerald-600',
                            )}
                          >
                            {formatCurrency(spent)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              hasLimit && spent > limitAmount && 'font-semibold text-destructive',
                              hasLimit &&
                                spent <= limitAmount &&
                                spentRatio >= nearLimitThreshold &&
                                'font-semibold text-amber-600',
                              hasLimit && spentRatio < nearLimitThreshold && 'font-semibold text-emerald-600',
                            )}
                          >
                            {formatCurrency(available)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        Nenhuma categoria encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {categories.length > 0 ? (
                    <TableRow className="bg-muted/40">
                      <TableCell className="font-semibold">Total por categorias</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(categoryTotals.limit)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(categoryTotals.spent)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(categoryTotals.available)}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSavingBudget || budgetForm.formState.isSubmitting}>
                {isSavingBudget ? 'Salvando...' : 'Salvar orçamento'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={budgetForm.formState.isSubmitting || !budgetForm.formState.isDirty}
                onClick={() => {
                  const targetMonth = selectedMonth || monthValue;
                  budgetForm.reset(getBudgetFormValues(targetMonth));
                }}
              >
                Redefinir dados
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isCopying || !canCopyPrevious || !selectedMonth}
                onClick={() => {
                  startCopyTransition(async () => {
                    await copyPreviousMonthBudgetItems(selectedMonth);
                    router.refresh();
                  });
                }}
              >
                {isCopying ? 'Copiando...' : 'Copiar mês anterior'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Orçamentos do ano vigente</CardTitle>
        </CardHeader>
        <CardContent>
          {yearBudgets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Meta de receita</TableHead>
                  <TableHead>Meta de investimento</TableHead>
                  <TableHead>Limite de despesa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearBudgets.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatMonthLabel(item.month)}</TableCell>
                    <TableCell>{formatCurrency(item.income_target ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(item.investment_target ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(item.expense_limit ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum orçamento definido no ano vigente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
