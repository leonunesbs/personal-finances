"use server";

import { revalidatePath } from "next/cache";

import { addMonths, parseAmount, parseDate, parseIntValue, toDateString } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const kind = getText(formData, "kind");
  const description = getText(formData, "description");
  const amount = parseAmount(formData.get("amount"));
  const occurredOn = toDateString(parseDate(formData.get("occurred_on")));
  const accountId = getText(formData, "account_id") || null;
  const toAccountId = getText(formData, "to_account_id") || null;
  const categoryId = getText(formData, "category_id") || null;
  const cardId = getText(formData, "card_id") || null;
  const transactionTypeId = getText(formData, "transaction_type_id") || null;
  const notes = getText(formData, "notes") || null;
  const installmentCount = Math.max(parseIntValue(formData.get("installments")), 0);
  const firstInstallmentOn = toDateString(parseDate(formData.get("first_installment_on") || occurredOn));
  const isRecurring = getText(formData, "is_recurring") === "true";
  const recurrenceFrequency = getText(formData, "recurrence_frequency");
  const recurrenceInterval = Math.max(parseIntValue(formData.get("recurrence_interval")), 1);
  const recurrenceEndOn = getText(formData, "recurrence_end_on") || null;
  const recurrenceOccurrences = parseIntValue(formData.get("recurrence_occurrences"));
  const tagIds = formData.getAll("tag_ids").filter((value): value is string => typeof value === "string");

  let resolvedAccountId = accountId;

  if (cardId && kind !== "transfer") {
    const { data: card } = await supabase.from("cards").select("account_id").eq("id", cardId).single();
    if (!card?.account_id) {
      return;
    }
    resolvedAccountId = card.account_id;
  }

  if (!kind || amount <= 0 || !resolvedAccountId) {
    return;
  }

  if (kind === "transfer" && !toAccountId) {
    return;
  }

  const payload = {
    user_id: user.id,
    kind,
    description,
    amount,
    occurred_on: occurredOn,
    account_id: resolvedAccountId,
    to_account_id: kind === "transfer" ? toAccountId : null,
    category_id: categoryId,
    card_id: cardId,
    transaction_type_id: transactionTypeId,
    notes,
  };

  const { data: transaction } = await supabase.from("transactions").insert(payload).select("id").single();

  if (transaction?.id && tagIds.length > 0) {
    await supabase.from("transaction_tags").insert(tagIds.map((tagId) => ({ transaction_id: transaction.id, tag_id: tagId })));
  }

  if (transaction?.id && installmentCount > 1) {
    const installments = Array.from({ length: installmentCount }, (_, index) => {
      const dueOn = addMonths(new Date(`${firstInstallmentOn}T00:00:00`), index);
      return {
        transaction_id: transaction.id,
        installment_number: index + 1,
        total_installments: installmentCount,
        due_on: toDateString(dueOn),
        amount,
      };
    });

    await supabase.from("transaction_installments").insert(installments);
  }

  if (isRecurring) {
    await supabase.from("recurring_rules").insert({
      user_id: user.id,
      kind,
      description,
      amount,
      account_id: accountId,
      to_account_id: kind === "transfer" ? toAccountId : null,
      category_id: categoryId,
      card_id: cardId,
      transaction_type_id: transactionTypeId,
      start_on: occurredOn,
      end_on: recurrenceEndOn,
      frequency: recurrenceFrequency || "monthly",
      interval: recurrenceInterval,
      occurrences: recurrenceOccurrences || null,
      next_run_on: occurredOn,
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
}
