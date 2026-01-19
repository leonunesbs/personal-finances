"use server";

import { revalidatePath } from "next/cache";

import { addMonths, parseAmount, parseDate, parseIntValue, toDateString } from "@/lib/finance";
import { requireUser } from "@/lib/supabase/auth";

const debugLog = (payload: Record<string, unknown>) => {
  // #region agent log
  fetch("http://127.0.0.1:7243/ingest/020c20af-9e01-4cb4-87a1-79898c378dda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "pre-fix",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
  // #endregion
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const kind = getText(formData, "kind");
  const description = getText(formData, "description");
  const amount = parseAmount(formData.get("amount"));
  const occurredOn = toDateString(parseDate(formData.get("occurred_on")));
  const accountId = getText(formData, "account_id") || null;
  const toAccountId = getText(formData, "to_account_id") || null;
  const categoryId = getText(formData, "category_id") || null;
  const cardId = getText(formData, "card_id") || null;
  const notes = getText(formData, "notes") || null;
  const installmentCount = Math.max(parseIntValue(formData.get("installments")), 0);
  const firstInstallmentOn = toDateString(parseDate(formData.get("first_installment_on") || occurredOn));
  const isRecurring = getText(formData, "is_recurring") === "true";
  const recurrenceFrequency = getText(formData, "recurrence_frequency");
  const recurrenceInterval = Math.max(parseIntValue(formData.get("recurrence_interval")), 1);
  const recurrenceEndOn = getText(formData, "recurrence_end_on") || null;
  const recurrenceOccurrences = parseIntValue(formData.get("recurrence_occurrences"));
  const tagIds = formData.getAll("tag_ids").filter((value): value is string => typeof value === "string");

  debugLog({
    hypothesisId: "H5",
    location: "transactions/actions.ts:40",
    message: "auth context",
    data: {
      userId: user.id,
      sessionUserId: sessionData.session?.user?.id ?? null,
      hasAccessToken: Boolean(sessionData.session?.access_token),
    },
  });

  debugLog({
    hypothesisId: "H1",
    location: "transactions/actions.ts:44",
    message: "createTransaction parsed fields",
    data: {
      kind,
      amount,
      hasAccountId: Boolean(accountId),
      hasToAccountId: Boolean(toAccountId),
      hasCardId: Boolean(cardId),
      hasCategoryId: Boolean(categoryId),
      installmentCount,
      isRecurring,
      recurrenceFrequency,
      recurrenceInterval,
      hasRecurrenceEndOn: Boolean(recurrenceEndOn),
      hasRecurrenceOccurrences: Boolean(recurrenceOccurrences),
      tagCount: tagIds.length,
    },
  });

  let resolvedAccountId = accountId;
  let cardAccountId: string | null = null;

  if (cardId) {
    const { data: card } = await supabase.from("cards").select("account_id").eq("id", cardId).single();
    cardAccountId = card?.account_id ?? null;
    debugLog({
      hypothesisId: "H2",
      location: "transactions/actions.ts:63",
      message: "card lookup result",
      data: { hasCardAccountId: Boolean(cardAccountId) },
    });
    if (!cardAccountId) {
      debugLog({
        hypothesisId: "H2",
        location: "transactions/actions.ts:69",
        message: "returning due to missing card account",
        data: {},
      });
      return;
    }
  }

  if (accountId) {
    const { data: account } = await supabase.from("accounts").select("type").eq("id", accountId).single();
    debugLog({
      hypothesisId: "H3",
      location: "transactions/actions.ts:78",
      message: "account lookup result",
      data: { accountType: account?.type ?? "unknown" },
    });
    if (account?.type === "credit") {
      if (!cardId || cardAccountId !== accountId) {
        debugLog({
          hypothesisId: "H3",
          location: "transactions/actions.ts:85",
          message: "returning due to credit account mismatch",
          data: { hasCardId: Boolean(cardId), cardMatchesAccount: cardAccountId === accountId },
        });
        return;
      }
    }
  }

  if (cardId && kind !== "transfer") {
    resolvedAccountId = cardAccountId;
  }

  if (!kind || amount <= 0 || !resolvedAccountId) {
    debugLog({
      hypothesisId: "H1",
      location: "transactions/actions.ts:99",
      message: "returning due to missing required fields",
      data: { hasKind: Boolean(kind), amount, hasResolvedAccountId: Boolean(resolvedAccountId) },
    });
    return;
  }

  if (kind === "transfer" && !toAccountId) {
    debugLog({
      hypothesisId: "H1",
      location: "transactions/actions.ts:108",
      message: "returning due to missing transfer account",
      data: { hasToAccountId: Boolean(toAccountId) },
    });
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
    notes,
  };

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert(payload)
    .select("id")
    .single();

  debugLog({
    hypothesisId: "H4",
    location: "transactions/actions.ts:129",
    message: "transaction insert result",
    data: {
      hasTransactionId: Boolean(transaction?.id),
      hasError: Boolean(transactionError),
      errorCode: transactionError?.code ?? null,
      errorMessage: transactionError?.message ?? null,
      errorHint: transactionError?.hint ?? null,
      errorDetails: transactionError?.details ?? null,
      kind,
      accountId: resolvedAccountId,
      toAccountId: kind === "transfer" ? toAccountId : null,
      cardId,
      categoryId,
    },
  });

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
