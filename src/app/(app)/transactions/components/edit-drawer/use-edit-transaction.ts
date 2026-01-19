import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatCurrencyValue } from "@/lib/finance";
import { parseInstallmentRatio, parsePositiveInt } from "../../utils";
import { editTransactionSchema, type EditTransactionFormValues } from "./edit-schema";
import { updateTransaction } from "../../actions";
import type { Account, CardItem, Transaction } from "../../types";

type UseEditTransactionProps = {
  accounts: Account[];
  cards: CardItem[];
  transactions: Transaction[];
};

export function useEditTransaction({ accounts, cards, transactions }: UseEditTransactionProps) {
  const router = useRouter();
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [editInstallmentConfirm, setEditInstallmentConfirm] = useState<{
    transactionId: string;
    values: EditTransactionFormValues;
  } | null>(null);

  const accountTypeMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.type])),
    [accounts]
  );

  const cardAccountMap = useMemo(
    () => new Map(cards.map((card) => [card.id, card.account_id ?? ""])),
    [cards]
  );

  const editSchema = useMemo(
    () =>
      editTransactionSchema(
        (accountId) => accountTypeMap.get(accountId),
        (cardId) => cardAccountMap.get(cardId) ?? undefined
      ),
    [accountTypeMap, cardAccountMap]
  );

  const editForm = useForm<EditTransactionFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      occurred_on: "",
      description: "",
      kind: "expense",
      account_id: "",
      to_account_id: "",
      category_id: "",
      card_id: "",
      amount: "",
      is_bill_payment: false,
      is_installment_payment: false,
      is_recurring_payment: false,
      installment_number: "",
      total_installments: "",
    },
  });

  const editKind = useWatch({ control: editForm.control, name: "kind" });
  const editAccountId = useWatch({ control: editForm.control, name: "account_id" });
  const editToAccountId = useWatch({ control: editForm.control, name: "to_account_id" });
  const editCardId = useWatch({ control: editForm.control, name: "card_id" });
  const editIsInstallmentPayment = useWatch({ control: editForm.control, name: "is_installment_payment" });

  const isEditTransfer = editKind === "transfer";
  const editIsCreditAccountSelected = Boolean(editAccountId) && accountTypeMap.get(editAccountId) === "credit";
  const editIsToAccountCreditSelected = Boolean(editToAccountId) && accountTypeMap.get(editToAccountId ?? "") === "credit";

  const editCardOptions = useMemo(() => {
    if (!editIsCreditAccountSelected || !editAccountId) {
      return [];
    }

    return cards
      .filter((card) => card.account_id === editAccountId)
      .map((card) => ({ value: card.id, label: card.name }));
  }, [cards, editAccountId, editIsCreditAccountSelected]);

  const shouldShowEditCard = editIsCreditAccountSelected;

  const editingTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === editingTransactionId) ?? null,
    [editingTransactionId, transactions]
  );

  const handleEditStart = (transaction: Transaction) => {
    const ratio = parseInstallmentRatio(transaction.description);
    setEditingTransactionId(transaction.id);
    editForm.reset({
      occurred_on: transaction.occurred_on ?? "",
      description: transaction.description ?? "",
      kind: transaction.kind ?? "expense",
      account_id: transaction.account_id ?? "",
      to_account_id: transaction.to_account_id ?? "",
      category_id: transaction.category_id ?? "",
      card_id: transaction.card_id ?? "",
      amount: formatCurrencyValue(transaction.amount),
      is_bill_payment: transaction.is_bill_payment ?? false,
      is_installment_payment: transaction.is_installment_payment ?? false,
      is_recurring_payment: transaction.is_recurring_payment ?? false,
      installment_number: ratio ? String(ratio.installmentNumber) : "",
      total_installments: ratio ? String(ratio.totalInstallments) : "",
    });
  };

  const handleEditCancel = () => {
    setEditingTransactionId(null);
    editForm.reset({
      occurred_on: "",
      description: "",
      kind: "expense",
      account_id: "",
      to_account_id: "",
      category_id: "",
      card_id: "",
      amount: "",
      is_bill_payment: false,
      is_installment_payment: false,
      is_recurring_payment: false,
      installment_number: "",
      total_installments: "",
    });
  };

  const submitEditTransaction = (
    transactionId: string,
    values: EditTransactionFormValues,
    createFutureInstallments: boolean
  ) => {
    startSaving(async () => {
      const formData = new FormData();
      formData.set("id", transactionId);
      formData.set("occurred_on", values.occurred_on ?? "");
      formData.set("description", values.description ?? "");
      formData.set("kind", values.kind ?? "");
      formData.set("account_id", values.account_id ?? "");
      formData.set("to_account_id", values.to_account_id ?? "");
      formData.set("category_id", values.category_id ?? "");
      formData.set("card_id", values.card_id ?? "");
      formData.set("amount", values.amount ?? "");
      formData.set("is_bill_payment", values.is_bill_payment ? "true" : "false");
      formData.set("is_installment_payment", values.is_installment_payment ? "true" : "false");
      formData.set("is_recurring_payment", values.is_recurring_payment ? "true" : "false");
      formData.set("installment_number", values.installment_number ?? "");
      formData.set("total_installments", values.total_installments ?? "");
      formData.set("create_future_installments", createFutureInstallments ? "true" : "false");
      const result = await updateTransaction(formData);
      if (!result?.ok) {
        toast.error(result?.message ?? "Erro ao atualizar transação.");
        return;
      }
      if ('warning' in result && result.warning) {
        toast(String(result.warning));
      }
      toast.success("Transação atualizada.");
      handleEditCancel();
      router.refresh();
    });
  };

  const handleEditSubmit = (transactionId: string) =>
    editForm.handleSubmit(
      (values) => {
        const installmentNumber = parsePositiveInt(values.installment_number);
        const totalInstallments = parsePositiveInt(values.total_installments);
        const shouldAskInstallments =
          values.is_installment_payment &&
          Boolean(installmentNumber) &&
          Boolean(totalInstallments) &&
          (totalInstallments ?? 0) > (installmentNumber ?? 0);
        if (shouldAskInstallments) {
          setEditInstallmentConfirm({ transactionId, values });
          return;
        }
        submitEditTransaction(transactionId, values, false);
      },
      () => {
        toast.error("Confira os campos antes de salvar.");
      }
    );

  const handleConfirmEditInstallments = (createFutureInstallments: boolean) => {
    if (!editInstallmentConfirm) return;
    submitEditTransaction(editInstallmentConfirm.transactionId, editInstallmentConfirm.values, createFutureInstallments);
    setEditInstallmentConfirm(null);
  };

  // Side effects
  useEffect(() => {
    if (editKind !== "transfer") {
      editForm.setValue("to_account_id", "", { shouldValidate: true });
    }
  }, [editForm, editKind]);

  useEffect(() => {
    if (!editAccountId || !editIsCreditAccountSelected) {
      editForm.setValue("card_id", "", { shouldValidate: true });
    }
  }, [editAccountId, editForm, editIsCreditAccountSelected]);

  useEffect(() => {
    if (!editCardId) return;
    const nextLinkedAccountId = cardAccountMap.get(editCardId) ?? "";
    if (nextLinkedAccountId && nextLinkedAccountId !== editAccountId) {
      editForm.setValue("account_id", nextLinkedAccountId, { shouldValidate: true });
    }
  }, [cardAccountMap, editAccountId, editCardId, editForm]);

  // Reset is_bill_payment when not transfer or to_account is not credit
  useEffect(() => {
    if (editKind !== "transfer" || !editIsToAccountCreditSelected) {
      editForm.setValue("is_bill_payment", false, { shouldValidate: true });
    }
  }, [editForm, editKind, editIsToAccountCreditSelected]);

  return {
    editForm,
    editingTransactionId,
    editingTransaction,
    editKind,
    editAccountId,
    editCardId,
    editIsInstallmentPayment,
    isEditTransfer,
    editIsCreditAccountSelected,
    editIsToAccountCreditSelected,
    editCardOptions,
    shouldShowEditCard,
    isSaving,
    editInstallmentConfirm,
    handleEditStart,
    handleEditCancel,
    handleEditSubmit,
    handleConfirmEditInstallments,
  };
}
