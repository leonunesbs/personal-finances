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

function parseMonth(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonth(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-01`;
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
  const reservePercent = parsePercent(getText(formData, "reserve_percent"));
  const investmentTarget = incomeTarget * (investmentPercent / 100);
  const reserveTarget = incomeTarget * (reservePercent / 100);
  const expenseLimit = Math.max(incomeTarget - investmentTarget - reserveTarget, 0);

  if (!month) return;

  await supabase.from("monthly_budgets").upsert(
    {
      user_id: user.id,
      month,
      income_target: incomeTarget,
      expense_limit: expenseLimit,
      investment_target: investmentTarget,
      reserve_target: reserveTarget,
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

export async function upsertBudgetItems(formData: FormData) {
  const { supabase, user } = await requireUser();
  const month = normalizeMonth(getText(formData, "month"));
  const itemsValue = formData.get("items");

  if (!month || typeof itemsValue !== "string") return;

  let parsedItems: Array<{ category_id?: string; amount_limit?: string }> = [];

  try {
    const decoded = JSON.parse(itemsValue);
    if (Array.isArray(decoded)) {
      parsedItems = decoded;
    }
  } catch {
    return;
  }

  const itemsToUpsert = parsedItems
    .filter((item) => typeof item?.category_id === "string" && item.category_id.trim() !== "")
    .map((item) => ({
      category_id: item.category_id!.trim(),
      amount_limit: parseAmount(typeof item.amount_limit === "string" ? item.amount_limit : ""),
    }));

  if (itemsToUpsert.length === 0) return;

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
    itemsToUpsert.map((item) => ({
      monthly_budget_id: resolvedBudgetId,
      category_id: item.category_id,
      amount_limit: item.amount_limit,
    })),
    { onConflict: "monthly_budget_id,category_id" }
  );

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function copyPreviousMonthBudgetItems(monthValue: string) {
  const { supabase, user } = await requireUser();
  const month = normalizeMonth(monthValue);
  const parsedMonth = parseMonth(month);

  if (!month || !parsedMonth) return;

  const previousMonth = new Date(parsedMonth);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthLabel = formatMonth(previousMonth);

  const { data: previousBudget } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", previousMonthLabel)
    .maybeSingle();

  if (!previousBudget?.id) return;

  const { data: previousItems } = await supabase
    .from("budget_items")
    .select("category_id, amount_limit")
    .eq("monthly_budget_id", previousBudget.id);

  if (!previousItems || previousItems.length === 0) return;

  const { data: currentBudget } = await supabase
    .from("monthly_budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  let resolvedBudgetId = currentBudget?.id;

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

  const itemsToUpsert = previousItems
    .filter((item) => Boolean(item.category_id))
    .map((item) => ({
      monthly_budget_id: resolvedBudgetId,
      category_id: item.category_id,
      amount_limit: item.amount_limit ?? 0,
    }));

  if (itemsToUpsert.length === 0) return;

  await supabase.from("budget_items").upsert(itemsToUpsert, {
    onConflict: "monthly_budget_id,category_id",
  });

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}
