"use server";

import { revalidatePath } from "next/cache";

import { parseAmount, parseDate, parseIntValue, toDateString } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getText(formData, "name");
  const type = getText(formData, "type") || "checking";
  const currency = getText(formData, "currency") || "BRL";
  const initialBalance = parseAmount(formData.get("initial_balance"));

  if (!name || !type) {
    return;
  }

  const profileByUserId = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profileByUserId.data) {
    const { error: profileError } = await supabase.from("user_profiles").insert({
      user_id: user.id,
      currency: currency || "BRL",
    });
    if (profileError) {
      return;
    }
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    currency,
    initial_balance: initialBalance,
  });

  revalidatePath("/settings");
}

export async function createCategory(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getText(formData, "name");

  if (!name) return;

  await supabase.from("categories").insert({
    user_id: user.id,
    name,
  });

  revalidatePath("/settings");
}

export async function createCard(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getText(formData, "name");
  const accountId = getText(formData, "account_id") || null;
  const last4 = getText(formData, "last4") || null;
  const closingDay = parseIntValue(formData.get("closing_day"));
  const dueDay = parseIntValue(formData.get("due_day"));
  const limitAmount = parseAmount(formData.get("limit_amount"));

  if (!name || closingDay <= 0 || dueDay <= 0) return;

  await supabase.from("cards").insert({
    user_id: user.id,
    account_id: accountId,
    name,
    last4,
    closing_day: closingDay,
    due_day: dueDay,
    limit_amount: limitAmount,
  });

  revalidatePath("/settings");
}

export async function createCardPayment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const cardId = getText(formData, "card_id");
  const accountId = getText(formData, "account_id");
  const amount = parseAmount(formData.get("amount"));
  const occurredOn = toDateString(parseDate(formData.get("occurred_on")));

  if (!cardId || !accountId || amount <= 0) return;

  const { data: card } = await supabase.from("cards").select("account_id, name").eq("id", cardId).single();

  if (!card?.account_id) return;

  await supabase.from("transactions").insert({
    user_id: user.id,
    kind: "transfer",
    description: `Pagamento fatura - ${card.name ?? "Cartão"}`,
    amount,
    occurred_on: occurredOn,
    account_id: accountId,
    to_account_id: card.account_id,
    card_id: cardId,
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
}

export async function createTag(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = getText(formData, "name");

  if (!name) return;

  await supabase.from("tags").insert({
    user_id: user.id,
    name,
  });

  revalidatePath("/settings");
}
