import { getMonthRange, toDateString } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

import { BudgetsClient } from "./budgets-client";

export const dynamic = "force-dynamic";

type BudgetsPageProps = {
  searchParams?:
    | {
        month?: string;
      }
    | Promise<{
        month?: string;
      }>;
};

function resolveMonth(value?: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return new Date();
  }
  const parsed = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const { supabase, user } = await requireUser();
  const resolvedSearchParams = await searchParams;
  const monthDate = resolveMonth(resolvedSearchParams?.month);
  const { startLabel, endLabel } = getMonthRange(monthDate);
  const currentYear = new Date().getFullYear();
  const yearStartLabel = toDateString(new Date(currentYear, 0, 1));
  const yearEndLabel = toDateString(new Date(currentYear, 11, 31));
  const previousMonthDate = new Date(monthDate);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const { startLabel: previousStartLabel } = getMonthRange(previousMonthDate);

  const [categories, budget, transactions, previousBudget, yearBudgets] = await Promise.all([
    supabase.from("categories").select("*").order("created_at"),
    supabase
      .from("monthly_budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", startLabel)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount, category_id, kind")
      .gte("occurred_on", startLabel)
      .lte("occurred_on", endLabel)
      .eq("user_id", user.id),
    supabase
      .from("monthly_budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("month", previousStartLabel)
      .maybeSingle(),
    supabase
      .from("monthly_budgets")
      .select("*")
      .eq("user_id", user.id)
      .gte("month", yearStartLabel)
      .lte("month", yearEndLabel)
      .order("month", { ascending: true }),
  ]);

  const { data: budgetItems } = budget.data?.id
    ? await supabase
        .from("budget_items")
        .select("*")
        .eq("monthly_budget_id", budget.data.id)
    : { data: [] };

  let hasPreviousCategoryBudget = false;

  if (previousBudget.data?.id) {
    const { count } = await supabase
      .from("budget_items")
      .select("id", { count: "exact", head: true })
      .eq("monthly_budget_id", previousBudget.data.id);
    hasPreviousCategoryBudget = (count ?? 0) > 0;
  }

  return (
    <BudgetsClient
      month={startLabel}
      categories={categories.data ?? []}
      budget={budget.data ?? null}
      budgetItems={budgetItems ?? []}
      transactions={transactions.data ?? []}
      canCopyPrevious={hasPreviousCategoryBudget}
      yearBudgets={yearBudgets.data ?? []}
    />
  );
}
