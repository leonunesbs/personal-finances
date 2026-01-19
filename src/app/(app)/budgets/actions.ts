"use server";

import { revalidatePath } from "next/cache";

import { parseAmount } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMonth(value: string) {
  if (!value) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}-01`;
  }

  if (value.length === 7) {
    return `${value}-01`;
  }

  return value;
}

function parsePercent(value: string) {
  if (!value) return 0;
  const normalized = value.replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 100);
}

export async function upsertMonthlyBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  const month = normalizeMonth(getText(formData, "month"));
  const incomeTarget = parseAmount(formData.get("income_target"));
  const investmentPercent = parsePercent(getText(formData, "investment_percent"));
  const investmentTarget = incomeTarget * (investmentPercent / 100);
  const expenseLimit = Math.max(incomeTarget - investmentTarget, 0);

  if (!month) return;

  await supabase.from("monthly_budgets").upsert(
    {
      user_id: user.id,
      month,
      income_target: incomeTarget,
      expense_limit: expenseLimit,
      investment_target: investmentTarget,
    },
    { onConflict: "user_id,month" }
  );

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function upsertBudgetItem(formData: FormData) {
  const { supabase, user } = await requireUser();
  const month = normalizeMonth(getText(formData, "month"));
  const categoryId = getText(formData, "category_id");
  const amountLimit = parseAmount(formData.get("amount_limit"));

  if (!month || !categoryId) return;

  const { data: budget } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  let resolvedBudgetId = budget?.id;

  if (!resolvedBudgetId) {
    const { data: insertedBudget } = await supabase
      .from("monthly_budgets")
      .insert({
        user_id: user.id,
        month,
      })
      .select("id")
      .single();
    resolvedBudgetId = insertedBudget?.id;
  }

  if (!resolvedBudgetId) return;

  await supabase.from("budget_items").upsert(
    {
      monthly_budget_id: resolvedBudgetId,
      category_id: categoryId,
      amount_limit: amountLimit,
    },
    { onConflict: "monthly_budget_id,category_id" }
  );

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}
