import Image from 'next/image';

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBinInfo } from '@/lib/bin-info';
import { addDays, formatCurrency, getMonthRange, getStatementDueDate, getStatementWindow } from '@/lib/finance';
import { requireUser } from '@/lib/supabase/auth';

import { DashboardFilters } from './dashboard-filters';

export const dynamic = 'force-dynamic';

type DashboardPageProps = {
  searchParams?:
    | {
        month?: string;
        year?: string;
      }
    | Promise<{
        month?: string;
        year?: string;
      }>;
};

type CardTheme = {
  gradient: string;
  overlay: string;
  badge?: {
    label: string;
    className: string;
  };
};

type CardBrand = {
  src: string;
  label: string;
};

const getCardBrand = (binInfo?: { cardType?: string | null; issuer?: string | null } | null): CardBrand | null => {
  const cardType = (binInfo?.cardType ?? '').toLowerCase();
  const issuer = (binInfo?.issuer ?? '').toLowerCase();
  if (cardType.includes('visa') || issuer.includes('visa')) {
    return { src: '/visa.png', label: 'Visa' };
  }
  if (cardType.includes('mastercard') || issuer.includes('mastercard')) {
    return { src: '/mastercard.png', label: 'Mastercard' };
  }
  return null;
};

const getCardTheme = (binInfo?: { cardType?: string | null; issuer?: string | null } | null): CardTheme => {
  const issuer = (binInfo?.issuer ?? '').toLowerCase();
  const cardType = (binInfo?.cardType ?? '').toLowerCase();
  const isNu = issuer.includes('nu pagamentos') || issuer.includes('nubank');
  const isMastercardBlack = cardType.includes('mastercard') && cardType.includes('black');

  if (isNu) {
    return {
      gradient: 'bg-gradient-to-br from-[#820AD1] via-[#6B05B5] to-[#4A0785]',
      overlay: 'bg-white/20',
      badge: isMastercardBlack
        ? {
            label: 'Mastercard Black',
            className: 'bg-black/60 text-white',
          }
        : undefined,
    };
  }

  if (isMastercardBlack) {
    return {
      gradient: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700',
      overlay: 'bg-white/10',
      badge: {
        label: 'Mastercard Black',
        className: 'bg-amber-200/90 text-amber-950',
      },
    };
  }

  return {
    gradient: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700',
    overlay: 'bg-white/20',
  };
};

const monthOptions = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' },
];

function resolveMonthYear(monthValue?: string, yearValue?: string) {
  const today = new Date();
  const month = Number.parseInt(monthValue ?? '', 10);
  const year = Number.parseInt(yearValue ?? '', 10);
  const resolvedMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : today.getMonth() + 1;
  const resolvedYear = Number.isFinite(year) && year >= 1900 && year <= 2100 ? year : today.getFullYear();
  const daysInMonth = new Date(resolvedYear, resolvedMonth, 0).getDate();
  const day = Math.min(today.getDate(), daysInMonth);
  return new Date(resolvedYear, resolvedMonth - 1, day);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { supabase, user } = await requireUser();
  const resolvedSearchParams = await searchParams;
  const selectedDate = resolveMonthYear(resolvedSearchParams?.month, resolvedSearchParams?.year);
  const now = selectedDate;
  const { startLabel, endLabel } = getMonthRange(selectedDate);
  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedYear = selectedDate.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, index) => selectedYear - 2 + index);
  const monthLabel = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const { data: monthTransactions } = await supabase
    .from('transactions')
    .select('amount, kind, category_id, card_id, occurred_on')
    .gte('occurred_on', startLabel)
    .lte('occurred_on', endLabel);

  const { data: budget } = await supabase
    .from('monthly_budgets')
    .select('id, income_target, expense_limit, investment_target, reserve_target')
    .eq('month', startLabel)
    .maybeSingle();

  const { data: budgetItems } = budget?.id
    ? await supabase.from('budget_items').select('id, category_id, amount_limit').eq('monthly_budget_id', budget.id)
    : { data: [] };

  const { data: categories } = await supabase.from('categories').select('id, name').eq('archived', false);

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency, initial_balance, archived')
    .eq('archived', false);

  const { data: accountTransactions } = await supabase
    .from('transactions')
    .select('amount, kind, account_id, to_account_id');

  const { data: debtInstallments } = await supabase
    .from('debt_installments')
    .select('amount, due_on, status')
    .order('due_on', { ascending: true });

  const { data: transactionInstallments } = await supabase
    .from('transaction_installments')
    .select('amount, due_on, paid')
    .order('due_on', { ascending: true });

  const { data: recurringRules } = await supabase
    .from('recurring_rules')
    .select('amount, next_run_on, active, end_on, kind')
    .eq('active', true);

  const { data: cards } = await supabase
    .from('cards')
    .select(
      'id, name, first6, last4, closing_day, due_day, limit_amount, account_id, bin_card_type, bin_issuer, bin_country',
    )
    .eq('archived', false);

  const cardRows = cards ?? [];
  const cardsNeedingBin = cardRows.filter(
    (card) => card.first6 && !card.bin_card_type && !card.bin_issuer && !card.bin_country,
  );
  const missingBins = Array.from(
    new Set(cardsNeedingBin.map((card) => card.first6).filter((value): value is string => Boolean(value))),
  );
  const binInfoEntries =
    missingBins.length > 0
      ? await Promise.all(missingBins.map(async (bin) => [bin, await getBinInfo(bin)] as const))
      : [];
  const binInfoByFirst6 = new Map(binInfoEntries);

  if (binInfoEntries.length > 0) {
    await Promise.all(
      binInfoEntries.map(async ([bin, info]) => {
        if (!info) return;
        await supabase
          .from('cards')
          .update({
            bin_card_type: info.cardType,
            bin_issuer: info.issuer,
            bin_country: info.country,
          })
          .eq('user_id', user.id)
          .eq('first6', bin);
      }),
    );
  }

  const cardWindows = cardRows.map((card) => ({
    cardId: card.id,
    name: card.name,
    first6: card.first6,
    last4: card.last4,
    limitAmount: Number(card.limit_amount ?? 0),
    accountId: card.account_id,
    closingDay: card.closing_day,
    dueDay: card.due_day,
    window: getStatementWindow(card.closing_day, now),
    binInfo: (() => {
      const fromDb = card.bin_card_type || card.bin_issuer || card.bin_country;
      if (fromDb) {
        return {
          cardType: card.bin_card_type ?? null,
          issuer: card.bin_issuer ?? null,
          country: card.bin_country ?? null,
        };
      }
      const fetched = card.first6 ? binInfoByFirst6.get(card.first6) : null;
      return fetched ?? null;
    })(),
  }));

  const cardStartLabels = cardWindows.map(({ window }) => window.startLabel);
  const cardEndLabels = cardWindows.map(({ window }) => window.endLabel);
  const cardIds = cardWindows.map(({ cardId }) => cardId);

  const minCardStart = cardStartLabels.length > 0 ? cardStartLabels.sort()[0] : null;
  const maxCardEnd = cardEndLabels.length > 0 ? cardEndLabels.sort().slice(-1)[0] : null;

  const { data: cardTransactions } =
    minCardStart && maxCardEnd && cardIds.length > 0
      ? await supabase
          .from('transactions')
          .select('amount, card_id, occurred_on, kind, to_account_id, is_bill_payment')
          .in('kind', ['expense', 'transfer'])
          .in('card_id', cardIds)
          .gte('occurred_on', minCardStart)
          .lte('occurred_on', maxCardEnd)
      : { data: [] };

  const totals = {
    income: 0,
    expense: 0,
    investmentContribution: 0,
    investmentWithdrawal: 0,
  };

  monthTransactions?.forEach((item) => {
    const amount = Number(item.amount ?? 0);
    if (item.kind === 'income') totals.income += amount;
    if (item.kind === 'expense') totals.expense += amount;
    if (item.kind === 'investment_contribution') totals.investmentContribution += amount;
    if (item.kind === 'investment_withdrawal') totals.investmentWithdrawal += amount;
  });

  const incomeTarget = Number(budget?.income_target ?? 0);
  const expenseLimit = Number(budget?.expense_limit ?? 0);
  const investmentTarget = Number(budget?.investment_target ?? 0);
  const reserveTarget = Number(budget?.reserve_target ?? 0);

  const remaining = Math.max(expenseLimit - totals.expense, 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(daysInMonth - now.getDate() + 1, 1);
  const dailyAllowance = remainingDays > 0 ? remaining / remainingDays : 0;
  const saved = totals.income - totals.expense - totals.investmentContribution;

  // Budget progress calculations
  const incomeProgress = incomeTarget > 0 ? Math.min((totals.income / incomeTarget) * 100, 100) : 0;
  const expenseProgress = expenseLimit > 0 ? Math.min((totals.expense / expenseLimit) * 100, 100) : 0;
  const investmentProgress =
    investmentTarget > 0 ? Math.min((totals.investmentContribution / investmentTarget) * 100, 100) : 0;
  const reserveProgress = reserveTarget > 0 ? Math.min((saved / reserveTarget) * 100, 100) : 0;

  const incomeRemaining = Math.max(incomeTarget - totals.income, 0);
  const expenseRemaining = Math.max(expenseLimit - totals.expense, 0);
  const investmentRemaining = Math.max(investmentTarget - totals.investmentContribution, 0);
  const reserveRemaining = Math.max(reserveTarget - saved, 0);

  const hasBudget = incomeTarget > 0 || expenseLimit > 0 || investmentTarget > 0 || reserveTarget > 0;

  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const recurringWindowEnd = addDays(todayStart, 30);

  const parseDateValue = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const upcomingDebtInstallments = (debtInstallments ?? []).filter((installment) => {
    const dueDate = parseDateValue(installment.due_on);
    if (!dueDate) return false;
    if (installment.status === 'paid' || installment.status === 'cancelled') return false;
    return dueDate >= todayStart && dueDate <= recurringWindowEnd;
  });
  const upcomingDebtAmount = upcomingDebtInstallments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const activeRecurringRules = (recurringRules ?? []).filter((rule) => {
    if (!rule.active) return false;
    if (rule.kind !== 'expense') return false;
    const endOn = parseDateValue(rule.end_on);
    return !endOn || endOn >= todayStart;
  });
  const upcomingRecurring = activeRecurringRules.filter((rule) => {
    const nextRun = parseDateValue(rule.next_run_on);
    return nextRun ? nextRun >= todayStart && nextRun <= recurringWindowEnd : false;
  });
  const upcomingRecurringAmount = upcomingRecurring.reduce((sum, rule) => sum + Number(rule.amount ?? 0), 0);

  const activeInstallments = (transactionInstallments ?? []).filter((installment) => !installment.paid);
  const activeInstallmentsAmount = activeInstallments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const expenseByCategory = new Map<string, number>();
  monthTransactions?.forEach((item) => {
    if (item.kind !== 'expense' || !item.category_id) return;
    const current = expenseByCategory.get(item.category_id) ?? 0;
    expenseByCategory.set(item.category_id, current + Number(item.amount ?? 0));
  });

  const topCategories = Array.from(expenseByCategory.entries())
    .map(([categoryId, total]) => ({
      id: categoryId,
      name: categoryNameById.get(categoryId) ?? 'Sem categoria',
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const budgetCommitment = expenseLimit > 0 ? totals.expense / expenseLimit : 0;
  const budgetItemsWithSpend = (budgetItems ?? []).map((item) => {
    const spent = item.category_id ? (expenseByCategory.get(item.category_id) ?? 0) : 0;
    return {
      ...item,
      spent,
      remaining: Number(item.amount_limit ?? 0) - spent,
      name: item.category_id ? (categoryNameById.get(item.category_id) ?? 'Sem categoria') : 'Sem categoria',
    };
  });

  const currentBalanceByAccount = new Map<string, number>();
  (accounts ?? []).forEach((account) => {
    currentBalanceByAccount.set(account.id, Number(account.initial_balance ?? 0));
  });

  (accountTransactions ?? []).forEach((transaction) => {
    const amount = Number(transaction.amount ?? 0);
    if (!Number.isFinite(amount) || amount === 0) return;

    if (transaction.kind === 'transfer') {
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
    if (transaction.kind === 'income' || transaction.kind === 'investment_withdrawal') {
      currentBalanceByAccount.set(transaction.account_id, current + amount);
      return;
    }

    if (transaction.kind === 'expense' || transaction.kind === 'investment_contribution') {
      currentBalanceByAccount.set(transaction.account_id, current - amount);
    }
  });

  const accountsBalanceTotal = (accounts ?? []).reduce((sum, account) => {
    return sum + (currentBalanceByAccount.get(account.id) ?? Number(account.initial_balance ?? 0));
  }, 0);

  const cardSpendById = new Map<string, number>();
  const cardPaymentsById = new Map<string, number>();
  const cardTxns = cardTransactions ?? [];
  cardWindows.forEach(({ cardId, window, accountId }) => {
    const start = new Date(`${window.startLabel}T00:00:00`);
    const end = new Date(`${window.endLabel}T00:00:00`);
    let spent = 0;
    let paid = 0;
    cardTxns.forEach((txn) => {
      if (txn.card_id !== cardId) return;
      const occurredOn = new Date(`${txn.occurred_on}T00:00:00`);
      if (occurredOn < start || occurredOn > end) return;
      const amount = Number(txn.amount ?? 0);
      if (!Number.isFinite(amount) || amount === 0) return;
      if (txn.kind === 'expense') {
        spent += amount;
        return;
      }
      if (txn.kind === 'transfer' && accountId && txn.to_account_id === accountId) {
        if (txn.is_bill_payment) {
          paid += amount;
        }
      }
    });
    cardSpendById.set(cardId, spent);
    cardPaymentsById.set(cardId, paid);
  });

  const cardSummaries = cardWindows.map((card) => {
    const spent = cardSpendById.get(card.cardId) ?? 0;
    const paid = cardPaymentsById.get(card.cardId) ?? 0;
    const outstanding = Math.max(spent - paid, 0);
    const remainingLimit = Math.max(card.limitAmount - outstanding, 0);
    const usage = card.limitAmount > 0 ? Math.min(outstanding / card.limitAmount, 1) : 0;
    const dueDate = getStatementDueDate(card.window.closingDate, card.dueDay);
    const isOverLimit = card.limitAmount > 0 && outstanding > card.limitAmount;
    const binLabel = [card.binInfo?.cardType, card.binInfo?.issuer].filter(Boolean).join(' • ');
    const theme = getCardTheme(card.binInfo);
    const brand = getCardBrand(card.binInfo);
    return {
      ...card,
      spent,
      paid,
      outstanding,
      remainingLimit,
      usage,
      dueDate,
      isOverLimit,
      binLabel,
      theme,
      brand,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resumo do mês</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <DashboardFilters
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          yearOptions={yearOptions}
          monthOptions={monthOptions}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-200/60 bg-emerald-50/40">
          <CardHeader>
            <CardDescription>Receitas</CardDescription>
            <CardTitle className="text-emerald-600">{formatCurrency(totals.income, 'BRL')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-rose-200/60 bg-rose-50/40">
          <CardHeader>
            <CardDescription>Despesas</CardDescription>
            <CardTitle className="text-rose-600">{formatCurrency(totals.expense, 'BRL')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-200/60 bg-emerald-50/40">
          <CardHeader>
            <CardDescription>Investimentos</CardDescription>
            <CardTitle className="text-emerald-600">{formatCurrency(totals.investmentContribution, 'BRL')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={remaining > 0 ? 'border-emerald-200/60 bg-emerald-50/40' : 'border-rose-200/60 bg-rose-50/40'}>
          <CardHeader>
            <CardDescription>Limite diário</CardDescription>
            <CardTitle className={remaining > 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {formatCurrency(dailyAllowance, 'BRL')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      {hasBudget && (
        <Card>
          <CardHeader>
            <CardTitle>Progresso do Orçamento</CardTitle>
            <CardDescription>Acompanhe suas metas financeiras do mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {incomeTarget > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Meta de Receita</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totals.income, 'BRL')} de {formatCurrency(incomeTarget, 'BRL')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${incomeProgress >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      {incomeProgress.toFixed(0)}%
                    </p>
                    {incomeRemaining > 0 && (
                      <p className="text-xs text-muted-foreground">Faltam {formatCurrency(incomeRemaining, 'BRL')}</p>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${incomeProgress >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${incomeProgress}%` }}
                  />
                </div>
              </div>
            )}
            {expenseLimit > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Limite de Despesas</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totals.expense, 'BRL')} de {formatCurrency(expenseLimit, 'BRL')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${expenseProgress <= 100 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {expenseProgress.toFixed(0)}%
                    </p>
                    {expenseProgress <= 100 && expenseRemaining > 0 && (
                      <p className="text-xs text-muted-foreground">Restam {formatCurrency(expenseRemaining, 'BRL')}</p>
                    )}
                    {expenseProgress > 100 && (
                      <p className="text-xs text-rose-600">
                        Excedeu em {formatCurrency(totals.expense - expenseLimit, 'BRL')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${expenseProgress <= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(expenseProgress, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {investmentTarget > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Meta de Investimento</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totals.investmentContribution, 'BRL')} de {formatCurrency(investmentTarget, 'BRL')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${investmentProgress >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      {investmentProgress.toFixed(0)}%
                    </p>
                    {investmentRemaining > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Faltam {formatCurrency(investmentRemaining, 'BRL')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${investmentProgress >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${investmentProgress}%` }}
                  />
                </div>
              </div>
            )}
            {reserveTarget > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Meta de Reserva</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(saved, 'BRL')} de {formatCurrency(reserveTarget, 'BRL')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${reserveProgress >= 100 ? 'text-emerald-600' : saved >= 0 ? 'text-amber-600' : 'text-rose-600'}`}
                    >
                      {reserveProgress.toFixed(0)}%
                    </p>
                    {saved >= 0 && reserveRemaining > 0 && (
                      <p className="text-xs text-muted-foreground">Faltam {formatCurrency(reserveRemaining, 'BRL')}</p>
                    )}
                    {saved < 0 && (
                      <p className="text-xs text-rose-600">Déficit de {formatCurrency(Math.abs(saved), 'BRL')}</p>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${reserveProgress >= 100 ? 'bg-emerald-500' : saved >= 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(Math.max(reserveProgress, 0), 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dívidas futuras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(upcomingDebtAmount, 'BRL')}</p>
            <p className="mt-2 text-sm text-muted-foreground">Parcelas: {upcomingDebtInstallments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(upcomingRecurringAmount, 'BRL')}</p>
            <p className="mt-2 text-sm text-muted-foreground">Ativas: {activeRecurringRules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Parcelamentos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(activeInstallmentsAmount, 'BRL')}</p>
            <p className="mt-2 text-sm text-muted-foreground">Em aberto: {activeInstallments.length}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {hasBudget && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Orçamento</CardTitle>
              <CardDescription>Visão geral das suas metas financeiras</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {incomeTarget > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Receita planejada</p>
                    <p className="text-lg font-semibold text-emerald-600">{formatCurrency(incomeTarget, 'BRL')}</p>
                  </div>
                )}
                {expenseLimit > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Limite de gastos</p>
                    <p className="text-lg font-semibold text-rose-600">{formatCurrency(expenseLimit, 'BRL')}</p>
                  </div>
                )}
                {investmentTarget > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Meta de investimento</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(investmentTarget, 'BRL')}</p>
                  </div>
                )}
                {reserveTarget > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Meta de reserva</p>
                    <p className="text-lg font-semibold text-amber-600">{formatCurrency(reserveTarget, 'BRL')}</p>
                  </div>
                )}
              </div>
              {(incomeTarget > 0 || expenseLimit > 0) && (
                <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Resultado esperado</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(incomeTarget - expenseLimit - investmentTarget, 'BRL')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Categorias com maiores despesas</CardTitle>
            <CardDescription>Top 5 categorias do mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.length > 0 ? (
              topCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{category.name}</span>
                  <span className="ml-2 font-medium">{formatCurrency(category.total, 'BRL')}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem despesas registradas no mês.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cartões de crédito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cardSummaries.length > 0 ? (
            cardSummaries.length > 1 ? (
              <Carousel opts={{ align: 'start', loop: true }}>
                <CarouselContent>
                  {cardSummaries.map((card) => (
                    <CarouselItem key={card.cardId} className="basis-full">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:items-start">
                        <div
                          className={`relative mx-auto min-h-[240px] sm:aspect-[1.586] w-full max-w-[480px] overflow-visible sm:overflow-hidden rounded-xl sm:rounded-2xl border border-white/40 p-4 sm:p-4 md:p-5 text-white shadow-sm ${card.theme.gradient}`}
                        >
                          <div
                            className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${card.theme.overlay}`}
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-white/80">
                            <span className="text-[10px] sm:text-sm">Cartão</span>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              {card.brand && (
                                <Image
                                  src={card.brand.src}
                                  alt={card.brand.label}
                                  width={48}
                                  height={20}
                                  className="h-4 sm:h-5 w-auto object-contain"
                                />
                              )}
                              <span className="text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">{card.name}</span>
                            </div>
                          </div>
                          {card.binLabel && <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/70 truncate">{card.binLabel}</p>}
                          {card.theme.badge && (
                            <span
                              className={`mt-1.5 sm:mt-2 inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wide ${card.theme.badge.className}`}
                            >
                              {card.theme.badge.label}
                            </span>
                          )}
                          <div className="mt-2 sm:mt-4 flex items-center justify-between gap-2">
                            <Image
                              src="/chip.png"
                              alt="Chip"
                              width={64}
                              height={42}
                              className="h-7 sm:h-10 w-auto flex-shrink-0 rounded-md border border-white/30 bg-white/10 px-1 sm:px-2 py-0.5 sm:py-1"
                            />
                            <div className="text-[11px] sm:text-sm text-white/80 flex-shrink-0">
                              {card.last4 ? `•••• ${card.last4}` : '**** ****'}
                            </div>
                          </div>
                          <div className="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                            <p className="text-[9px] sm:text-xs uppercase tracking-wider text-white/70">Fatura atual</p>
                            <p className="text-lg sm:text-2xl font-semibold break-words leading-tight">{formatCurrency(card.outstanding, 'BRL')}</p>
                          </div>
                          <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                            <div className="h-1.5 sm:h-2 w-full rounded-full bg-white/20">
                              <div className="h-1.5 sm:h-2 rounded-full bg-white/80" style={{ width: `${card.usage * 100}%` }} />
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[9px] sm:text-xs text-white/70">
                              <span className="truncate min-w-0 flex-1">Limite: {formatCurrency(card.limitAmount, 'BRL')}</span>
                              <span className="flex-shrink-0 font-medium">{Math.round(card.usage * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{card.name}</span>
                            <span
                              className={
                                card.isOverLimit ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-600'
                              }
                            >
                              {formatCurrency(card.remainingLimit, 'BRL')}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
                            <span>Fecha em {card.window.closingDate.toLocaleDateString('pt-BR')}</span>
                            <span className="sm:text-right">Vence em {card.dueDate.toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 sm:left-6" />
                <CarouselNext className="right-4 sm:right-6" />
              </Carousel>
            ) : (
              <div className="space-y-4">
                {cardSummaries.map((card) => (
                  <div
                    key={card.cardId}
                    className="grid gap-4 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:items-start"
                  >
                    <div
                      className={`relative mx-auto min-h-[240px] sm:aspect-[1.586] w-full max-w-[480px] overflow-visible sm:overflow-hidden rounded-xl sm:rounded-2xl border border-white/40 p-4 sm:p-4 md:p-5 text-white shadow-sm ${card.theme.gradient}`}
                    >
                      <div
                        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${card.theme.overlay}`}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-white/80">
                        <span className="text-[10px] sm:text-sm">Cartão</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {card.brand && (
                            <Image
                              src={card.brand.src}
                              alt={card.brand.label}
                              width={48}
                              height={20}
                              className="h-4 sm:h-5 w-auto object-contain"
                            />
                          )}
                          <span className="text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">{card.name}</span>
                        </div>
                      </div>
                      {card.binLabel && <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/70 truncate">{card.binLabel}</p>}
                      {card.theme.badge && (
                        <span
                          className={`mt-1.5 sm:mt-2 inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wide ${card.theme.badge.className}`}
                        >
                          {card.theme.badge.label}
                        </span>
                      )}
                      <div className="mt-2 sm:mt-4 flex items-center justify-between gap-2">
                        <Image
                          src="/chip.png"
                          alt="Chip"
                          width={64}
                          height={42}
                          className="h-7 sm:h-10 w-auto flex-shrink-0 rounded-md border border-white/30 bg-white/10 px-1 sm:px-2 py-0.5 sm:py-1"
                        />
                        <div className="text-[11px] sm:text-sm text-white/80 flex-shrink-0">{card.last4 ? `•••• ${card.last4}` : '**** ****'}</div>
                      </div>
                      <div className="mt-3 sm:mt-6 space-y-1 sm:space-y-2">
                        <p className="text-[9px] sm:text-xs uppercase tracking-wider text-white/70">Fatura atual</p>
                        <p className="text-lg sm:text-2xl font-semibold break-words leading-tight">{formatCurrency(card.outstanding, 'BRL')}</p>
                      </div>
                      <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                        <div className="h-1.5 sm:h-2 w-full rounded-full bg-white/20">
                          <div className="h-1.5 sm:h-2 rounded-full bg-white/80" style={{ width: `${card.usage * 100}%` }} />
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[9px] sm:text-xs text-white/70">
                          <span className="truncate min-w-0 flex-1">Limite: {formatCurrency(card.limitAmount, 'BRL')}</span>
                          <span className="flex-shrink-0 font-medium">{Math.round(card.usage * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{card.name}</span>
                        <span
                          className={
                            card.isOverLimit ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-600'
                          }
                        >
                          {formatCurrency(card.remainingLimit, 'BRL')}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
                        <span>Fecha em {card.window.closingDate.toLocaleDateString('pt-BR')}</span>
                        <span className="sm:text-right">Vence em {card.dueDate.toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Orçamento por categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {budgetItemsWithSpend.length > 0 ? (
            budgetItemsWithSpend.map((item) => {
              const limit = Number(item.amount_limit ?? 0);
              const usage = limit > 0 ? item.spent / limit : 0;
              const isOverLimit = limit > 0 && item.spent > limit;
              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span>
                      {formatCurrency(item.spent, 'BRL')} / {formatCurrency(limit, 'BRL')}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={isOverLimit ? 'h-2 rounded-full bg-rose-500' : 'h-2 rounded-full bg-emerald-500'}
                      style={{ width: `${Math.min(usage * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum limite por categoria definido.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Economia do mês</CardTitle>
          {reserveTarget > 0 && (
            <CardDescription>
              {saved >= reserveTarget
                ? 'Meta de reserva atingida!'
                : `Faltam ${formatCurrency(reserveRemaining, 'BRL')} para a meta`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <p
            className={saved >= 0 ? 'text-2xl font-semibold text-emerald-600' : 'text-2xl font-semibold text-rose-600'}
          >
            {formatCurrency(saved, 'BRL')}
          </p>
          {reserveTarget > 0 && (
            <>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-all ${saved >= reserveTarget ? 'bg-emerald-500' : saved >= 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(Math.max(reserveProgress, 0), 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {reserveProgress.toFixed(0)}% da meta de {formatCurrency(reserveTarget, 'BRL')}
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Saldo das contas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCurrency(accountsBalanceTotal, 'BRL')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
