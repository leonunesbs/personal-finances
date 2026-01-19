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

  const { data: cards } = await supabase
    .from("cards")
    .select("id, name, last4, closing_day, due_day, limit_amount")
    .eq("archived", false);

  const cardWindows = (cards ?? []).map((card) => ({
    cardId: card.id,
    name: card.name,
    last4: card.last4,
    limitAmount: Number(card.limit_amount ?? 0),
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
          .select("amount, card_id, occurred_on, kind")
          .eq("kind", "expense")
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

  const cardSpendById = new Map<string, number>();
  const cardTxns = cardTransactions ?? [];
  cardWindows.forEach(({ cardId, window }) => {
    const start = new Date(`${window.startLabel}T00:00:00`);
    const end = new Date(`${window.endLabel}T00:00:00`);
    const spent = cardTxns.reduce((sum, txn) => {
      if (txn.card_id !== cardId) return sum;
      const occurredOn = new Date(`${txn.occurred_on}T00:00:00`);
      if (occurredOn < start || occurredOn > end) return sum;
      return sum + Number(txn.amount ?? 0);
    }, 0);
    cardSpendById.set(cardId, spent);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumo do mês</h1>
        <p className="text-sm">Acompanhe receitas, despesas e investimentos.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Receitas</CardDescription>
            <CardTitle>{formatCurrency(totals.income, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Meta: {formatCurrency(budget?.income_target ?? 0, "BRL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Despesas</CardDescription>
            <CardTitle>{formatCurrency(totals.expense, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Limite: {formatCurrency(expenseLimit, "BRL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Investimentos</CardDescription>
            <CardTitle>{formatCurrency(totals.investmentContribution, "BRL")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Meta: {formatCurrency(investmentTarget, "BRL")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Limite diário</CardDescription>
            <CardTitle>{formatCurrency(dailyAllowance, "BRL")}</CardTitle>
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
            <p className="text-2xl font-semibold">
              {expenseLimit > 0 ? `${(budgetCommitment * 100).toFixed(1)}%` : "Sem limite definido"}
            </p>
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
          {cardWindows.length > 0 ? (
            cardWindows.map((card) => {
              const spent = cardSpendById.get(card.cardId) ?? 0;
              const remainingLimit = Math.max(card.limitAmount - spent, 0);
              const dueDate = getStatementDueDate(card.window.closingDate, card.dueDay);
              return (
                <div key={card.cardId} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {card.name}
                      {card.last4 ? ` •••• ${card.last4}` : ""}
                    </span>
                    <span>{formatCurrency(spent, "BRL")}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Fatura: {card.window.start.toLocaleDateString("pt-BR")} a{" "}
                      {card.window.end.toLocaleDateString("pt-BR")}
                    </span>
                    <span>Fecha em {card.window.closingDate.toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Vence em {dueDate.toLocaleDateString("pt-BR")}</span>
                    <span>Disponível: {formatCurrency(remainingLimit, "BRL")}</span>
                  </div>
                </div>
              );
            })
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
            budgetItemsWithSpend.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span>
                  {formatCurrency(item.spent, "BRL")} / {formatCurrency(item.amount_limit ?? 0, "BRL")}
                </span>
              </div>
            ))
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
          <p className="text-2xl font-semibold">{formatCurrency(saved, "BRL")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
