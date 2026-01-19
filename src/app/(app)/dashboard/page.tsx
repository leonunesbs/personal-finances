import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getMonthRange, getStatementDueDate, getStatementWindow } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const now = new Date();
  const { startLabel, endLabel } = getMonthRange(now);

  const { data: monthTransactions } = await supabase
    .from("transactions")
    .select("amount, kind, category_id, card_id, occurred_on")
    .gte("occurred_on", startLabel)
    .lte("occurred_on", endLabel);

  const { data: budget } = await supabase
    .from("monthly_budgets")
    .select("id, income_target, expense_limit, investment_target")
    .eq("month", startLabel)
    .maybeSingle();

  const { data: budgetItems } = budget?.id
    ? await supabase
        .from("budget_items")
        .select("id, category_id, amount_limit")
        .eq("monthly_budget_id", budget.id)
    : { data: [] };

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("archived", false);

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, currency, initial_balance, archived")
    .eq("archived", false);

  const { data: accountTransactions } = await supabase
    .from("transactions")
    .select("amount, kind, account_id, to_account_id");

  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, last4, closing_day, due_day, limit_amount, account_id")
    .eq("archived", false);

  const cardWindows = (cards ?? []).map((card) => ({
    cardId: card.id,
    name: card.name,
    last4: card.last4,
    limitAmount: Number(card.limit_amount ?? 0),
    accountId: card.account_id,
    closingDay: card.closing_day,
    dueDay: card.due_day,
    window: getStatementWindow(card.closing_day, now),
  }));

  const cardStartLabels = cardWindows.map(({ window }) => window.startLabel);
  const cardEndLabels = cardWindows.map(({ window }) => window.endLabel);
  const cardIds = cardWindows.map(({ cardId }) => cardId);

  const minCardStart = cardStartLabels.length > 0 ? cardStartLabels.sort()[0] : null;
  const maxCardEnd = cardEndLabels.length > 0 ? cardEndLabels.sort().slice(-1)[0] : null;

  const { data: cardTransactions } =
    minCardStart && maxCardEnd && cardIds.length > 0
      ? await supabase
          .from("transactions")
          .select("amount, card_id, occurred_on, kind, to_account_id")
          .in("kind", ["expense", "transfer"])
          .in("card_id", cardIds)
          .gte("occurred_on", minCardStart)
          .lte("occurred_on", maxCardEnd)
      : { data: [] };

  const totals = {
    income: 0,
    expense: 0,
    investmentContribution: 0,
    investmentWithdrawal: 0,
  };

  monthTransactions?.forEach((item) => {
    const amount = Number(item.amount ?? 0);
    if (item.kind === "income") totals.income += amount;
    if (item.kind === "expense") totals.expense += amount;
    if (item.kind === "investment_contribution") totals.investmentContribution += amount;
    if (item.kind === "investment_withdrawal") totals.investmentWithdrawal += amount;
  });

  const expenseLimit = Number(budget?.expense_limit ?? 0);
  const investmentTarget = Number(budget?.investment_target ?? 0);
  const remaining = Math.max(expenseLimit - totals.expense, 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(daysInMonth - now.getDate() + 1, 1);
  const dailyAllowance = remainingDays > 0 ? remaining / remainingDays : 0;
  const saved = totals.income - totals.expense - totals.investmentContribution;

  const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const expenseByCategory = new Map<string, number>();
  monthTransactions?.forEach((item) => {
    if (item.kind !== "expense" || !item.category_id) return;
    const current = expenseByCategory.get(item.category_id) ?? 0;
    expenseByCategory.set(item.category_id, current + Number(item.amount ?? 0));
  });

  const topCategories = Array.from(expenseByCategory.entries())
    .map(([categoryId, total]) => ({
      id: categoryId,
      name: categoryNameById.get(categoryId) ?? "Sem categoria",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const budgetCommitment = expenseLimit > 0 ? totals.expense / expenseLimit : 0;
  const budgetItemsWithSpend = (budgetItems ?? []).map((item) => {
    const spent = item.category_id ? expenseByCategory.get(item.category_id) ?? 0 : 0;
    return {
      ...item,
      spent,
      remaining: Number(item.amount_limit ?? 0) - spent,
      name: item.category_id ? categoryNameById.get(item.category_id) ?? "Sem categoria" : "Sem categoria",
    };
  });

  const currentBalanceByAccount = new Map<string, number>();
  (accounts ?? []).forEach((account) => {
    currentBalanceByAccount.set(account.id, Number(account.initial_balance ?? 0));
  });

  (accountTransactions ?? []).forEach((transaction) => {
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
      if (txn.kind === "expense") {
        spent += amount;
        return;
      }
      if (txn.kind === "transfer" && accountId && txn.to_account_id === accountId) {
        paid += amount;
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
    return {
      ...card,
      spent,
      paid,
      outstanding,
      remainingLimit,
      usage,
      dueDate,
      isOverLimit,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumo do mês</h1>
        <p className="text-sm">Acompanhe receitas, despesas e investimentos.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-200/60 bg-emerald-50/40">
          <CardHeader>
            <CardDescription>Receitas</CardDescription>
            <CardTitle className="text-emerald-600">{formatCurrency(totals.income, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Meta: {formatCurrency(budget?.income_target ?? 0, "BRL")}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200/60 bg-rose-50/40">
          <CardHeader>
            <CardDescription>Despesas</CardDescription>
            <CardTitle className="text-rose-600">{formatCurrency(totals.expense, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Limite: {formatCurrency(expenseLimit, "BRL")}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/60 bg-emerald-50/40">
          <CardHeader>
            <CardDescription>Investimentos</CardDescription>
            <CardTitle className="text-emerald-600">{formatCurrency(totals.investmentContribution, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Meta: {formatCurrency(investmentTarget, "BRL")}</p>
          </CardContent>
        </Card>
        <Card className={remaining > 0 ? "border-emerald-200/60 bg-emerald-50/40" : "border-rose-200/60 bg-rose-50/40"}>
          <CardHeader>
            <CardDescription>Limite diário</CardDescription>
            <CardTitle className={remaining > 0 ? "text-emerald-600" : "text-rose-600"}>
              {formatCurrency(dailyAllowance, "BRL")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Restante: {formatCurrency(remaining, "BRL")} em {remainingDays} dias
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comprometimento do orçamento</CardTitle>
            <CardDescription>Gasto em relação ao limite mensal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={budgetCommitment <= 1 ? "text-2xl font-semibold text-emerald-600" : "text-2xl font-semibold text-rose-600"}>
              {expenseLimit > 0 ? `${(budgetCommitment * 100).toFixed(1)}%` : "Sem limite definido"}
            </p>
            {expenseLimit > 0 && (
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={budgetCommitment <= 1 ? "h-2 rounded-full bg-emerald-500" : "h-2 rounded-full bg-rose-500"}
                  style={{ width: `${Math.min(budgetCommitment * 100, 100)}%` }}
                />
              </div>
            )}
            <p className="text-sm">
              Gasto: {formatCurrency(totals.expense, "BRL")} · Limite: {formatCurrency(expenseLimit, "BRL")}
            </p>
            <p className="text-sm">Restante: {formatCurrency(remaining, "BRL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categorias com maiores despesas</CardTitle>
            <CardDescription>Top categorias do mês atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.length > 0 ? (
              topCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between text-sm">
                  <span>{category.name}</span>
                  <span className="font-medium">{formatCurrency(category.total, "BRL")}</span>
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
          <CardDescription>Resumo da fatura atual por cartão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cardSummaries.length > 0 ? (
            cardSummaries.length > 1 ? (
              <Carousel opts={{ align: "start", loop: true }}>
                <CarouselContent>
                  {cardSummaries.map((card) => (
                    <CarouselItem key={card.cardId} className="basis-full">
                      <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-5 text-white shadow-sm">
                          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
                          <div className="flex items-center justify-between text-sm text-white/80">
                            <span>Cartão</span>
                            <span>{card.name}</span>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-xs uppercase tracking-widest text-white/80">
                              Chip
                            </div>
                            <div className="text-sm text-white/80">
                              {card.last4 ? `•••• ${card.last4}` : "**** ****"}
                            </div>
                          </div>
                          <div className="mt-6 space-y-2">
                            <p className="text-xs uppercase tracking-wider text-white/70">Fatura atual</p>
                            <p className="text-2xl font-semibold">{formatCurrency(card.outstanding, "BRL")}</p>
                          </div>
                          <div className="mt-4">
                            <div className="h-2 w-full rounded-full bg-white/20">
                              <div className="h-2 rounded-full bg-white/80" style={{ width: `${card.usage * 100}%` }} />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                              <span>Limite: {formatCurrency(card.limitAmount, "BRL")}</span>
                              <span>{Math.round(card.usage * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{card.name}</span>
                            <span className={card.isOverLimit ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                              {formatCurrency(card.remainingLimit, "BRL")}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between text-muted-foreground">
                            <span>
                              Fatura: {card.window.start.toLocaleDateString("pt-BR")} a{" "}
                              {card.window.end.toLocaleDateString("pt-BR")}
                            </span>
                            <span>Fecha em {card.window.closingDate.toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between text-muted-foreground">
                            <span>Vence em {card.dueDate.toLocaleDateString("pt-BR")}</span>
                            <span>Disponível: {formatCurrency(card.remainingLimit, "BRL")}</span>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <div className="space-y-4">
                {cardSummaries.map((card) => (
                  <div key={card.cardId} className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-5 text-white shadow-sm">
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
                      <div className="flex items-center justify-between text-sm text-white/80">
                        <span>Cartão</span>
                        <span>{card.name}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-xs uppercase tracking-widest text-white/80">
                          Chip
                        </div>
                        <div className="text-sm text-white/80">
                          {card.last4 ? `•••• ${card.last4}` : "**** ****"}
                        </div>
                      </div>
                    <div className="mt-6 space-y-2">
                      <p className="text-xs uppercase tracking-wider text-white/70">Fatura atual</p>
                      <p className="text-2xl font-semibold">{formatCurrency(card.outstanding, "BRL")}</p>
                    </div>
                      <div className="mt-4">
                        <div className="h-2 w-full rounded-full bg-white/20">
                          <div className="h-2 rounded-full bg-white/80" style={{ width: `${card.usage * 100}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                          <span>Limite: {formatCurrency(card.limitAmount, "BRL")}</span>
                          <span>{Math.round(card.usage * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{card.name}</span>
                        <span className={card.isOverLimit ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                          {formatCurrency(card.remainingLimit, "BRL")}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between text-muted-foreground">
                        <span>
                          Fatura: {card.window.start.toLocaleDateString("pt-BR")} a{" "}
                          {card.window.end.toLocaleDateString("pt-BR")}
                        </span>
                        <span>Fecha em {card.window.closingDate.toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between text-muted-foreground">
                        <span>Vence em {card.dueDate.toLocaleDateString("pt-BR")}</span>
                        <span>Disponível: {formatCurrency(card.remainingLimit, "BRL")}</span>
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
          <CardDescription>Limites e gastos do mês atual.</CardDescription>
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
                      {formatCurrency(item.spent, "BRL")} / {formatCurrency(limit, "BRL")}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={isOverLimit ? "h-2 rounded-full bg-rose-500" : "h-2 rounded-full bg-emerald-500"}
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
          <CardDescription>Saldo após despesas e investimentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={saved >= 0 ? "text-2xl font-semibold text-emerald-600" : "text-2xl font-semibold text-rose-600"}>
            {formatCurrency(saved, "BRL")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Saldo das contas</CardTitle>
          <CardDescription>Total das contas cadastradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCurrency(accountsBalanceTotal, "BRL")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{accounts?.length ?? 0} conta(s) cadastrada(s)</p>
        </CardContent>
      </Card>
    </div>
  );
}
