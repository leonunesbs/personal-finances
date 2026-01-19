import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getMonthRange } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase } = await requireUser();
  const now = new Date();
  const { startLabel, endLabel } = getMonthRange(now);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, kind")
    .gte("occurred_on", startLabel)
    .lte("occurred_on", endLabel);

  const { data: budget } = await supabase
    .from("monthly_budgets")
    .select("income_target, expense_limit, investment_target")
    .eq("month", startLabel)
    .maybeSingle();

  const totals = {
    income: 0,
    expense: 0,
    investmentContribution: 0,
    investmentWithdrawal: 0,
  };

  transactions?.forEach((item) => {
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
            <p className="text-sm">Restante: {formatCurrency(remaining, "BRL")}</p>
          </CardContent>
        </Card>
      </div>
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
