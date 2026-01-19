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

export async function upsertMonthlyBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  const month = normalizeMonth(getText(formData, "month"));
  const incomeTarget = parseAmount(formData.get("income_target"));
  const expenseLimit = parseAmount(formData.get("expense_limit"));
  const investmentTarget = parseAmount(formData.get("investment_target"));

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

  const budgetId = budget?.id ?? (
    await supabase
      .from("monthly_budgets")
      .insert({
        user_id: user.id,
        month,
      })
      .select("id")
      .single()
  ).data?.id;

  if (!budgetId) return;

  await supabase.from("budget_items").upsert(
    {
      monthly_budget_id: budgetId,
      category_id: categoryId,
      amount_limit: amountLimit,
    },
    { onConflict: "monthly_budget_id,category_id" }
  );

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}
