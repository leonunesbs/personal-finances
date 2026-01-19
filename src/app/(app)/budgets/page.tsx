import { getMonthRange } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

import { BudgetsClient } from "./budgets-client";

export const dynamic = "force-dynamic";

type BudgetsPageProps = {
  searchParams?: {
    month?: string;
  };
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
  const monthDate = resolveMonth(searchParams?.month);
  const { startLabel, endLabel } = getMonthRange(monthDate);

  const [categories, budget, budgetItems, transactions] = await Promise.all([
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("monthly_budgets").select("*").eq("month", startLabel).maybeSingle(),
    supabase.from("budget_items").select("*"),
    supabase
      .from("transactions")
      .select("amount, category_id, kind")
      .gte("occurred_on", startLabel)
      .lte("occurred_on", endLabel)
      .eq("user_id", user.id),
  ]);

  return (
    <BudgetsClient
      month={startLabel}
      categories={categories.data ?? []}
      budget={budget.data ?? null}
      budgetItems={budgetItems.data ?? []}
      transactions={transactions.data ?? []}
    />
  );
}
