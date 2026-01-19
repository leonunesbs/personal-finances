import { useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { zodResolver } from '@hookform/resolvers/zod';

import { createTransactionSchema } from './create-schema';
import { createTransaction } from '../../actions';

import type { CreateTransactionFormValues } from './create-schema';
import type { Account, CardItem } from '../../types';

type UseTransactionFormProps = {
  accounts: Account[];
  cards: CardItem[];
  onSuccess?: () => void;
};

export function useTransactionForm({ accounts, cards, onSuccess }: UseTransactionFormProps) {
  const router = useRouter();
  const [isCreating, startCreating] = useTransition();

  const accountTypeMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.type])), [accounts]);

  const cardAccountMap = useMemo(() => new Map(cards.map((card) => [card.id, card.account_id ?? ''])), [cards]);

  const createSchema = useMemo(
    () =>
      createTransactionSchema(
        (accountId) => accountTypeMap.get(accountId),
        (cardId) => cardAccountMap.get(cardId) ?? undefined,
      ),
    [accountTypeMap, cardAccountMap],
  );

  const createDefaults = useMemo<CreateTransactionFormValues>(
    () => ({
      kind: 'expense',
      description: '',
      amount: '',
      occurred_on: '',
      account_id: '',
      to_account_id: '',
      to_card_id: '',
      category_id: '',
      card_id: '',
      notes: '',
      installments: '',
      first_installment_on: '',
      is_recurring: false,
      recurrence_frequency: '',
      recurrence_interval: '',
      recurrence_occurrences: '',
      recurrence_end_on: '',
      tag_ids: [],
      show_installments: false,
      is_bill_payment: false,
      is_installment_payment: false,
      is_recurring_payment: false,
    }),
    [],
  );

  const form = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: createDefaults,
  });

  const transactionKind = useWatch({ control: form.control, name: 'kind' });
  const selectedAccountId = useWatch({ control: form.control, name: 'account_id' });
  const selectedToAccountId = useWatch({ control: form.control, name: 'to_account_id' });
  const selectedCardId = useWatch({ control: form.control, name: 'card_id' });
  // const selectedToCardId = useWatch({ control: form.control, name: 'to_card_id' });
  const isRecurring = useWatch({ control: form.control, name: 'is_recurring' });
  const showInstallments = useWatch({ control: form.control, name: 'show_installments' });
  const selectedTags = useWatch({ control: form.control, name: 'tag_ids' }) ?? [];

  const safeSelectedAccountId = selectedAccountId ?? '';
  const linkedAccountId = selectedCardId ? (cardAccountMap.get(selectedCardId) ?? '') : '';
  const isAccountLocked = Boolean(linkedAccountId);
  const isCreditAccountSelected = safeSelectedAccountId
    ? accountTypeMap.get(safeSelectedAccountId) === 'credit'
    : false;

  const filteredCardOptions = useMemo(() => {
    if (!isCreditAccountSelected || !selectedAccountId) {
      return [];
    }

    return cards
      .filter((card) => card.account_id === selectedAccountId)
      .map((card) => ({ value: card.id, label: card.name }));
  }, [cards, isCreditAccountSelected, selectedAccountId]);

  const shouldShowCard = isCreditAccountSelected;
  const hasSelectedCard = Boolean(selectedCardId);

  // To account card selection logic
  const safeSelectedToAccountId = selectedToAccountId ?? '';
  const isToAccountCreditSelected = safeSelectedToAccountId
    ? accountTypeMap.get(safeSelectedToAccountId) === 'credit'
    : false;

  const filteredToCardOptions = useMemo(() => {
    if (!isToAccountCreditSelected || !selectedToAccountId) {
      return [];
    }

    return cards
      .filter((card) => card.account_id === selectedToAccountId)
      .map((card) => ({ value: card.id, label: card.name }));
  }, [cards, isToAccountCreditSelected, selectedToAccountId]);

  const shouldShowToCard = isToAccountCreditSelected;

  // Reset to_account_id and to_card_id when kind is not transfer
  useEffect(() => {
    if (transactionKind !== 'transfer') {
      form.setValue('to_account_id', '', { shouldValidate: true });
      form.setValue('to_card_id', '', { shouldValidate: true });
    }
  }, [form, transactionKind]);

  // Reset to_card_id when to_account changes and is not credit
  useEffect(() => {
    if (selectedToAccountId && !isToAccountCreditSelected) {
      form.setValue('to_card_id', '', { shouldValidate: true });
    }
  }, [form, selectedToAccountId, isToAccountCreditSelected]);

  // Reset is_bill_payment when not transfer or to_account is not credit
  useEffect(() => {
    if (transactionKind !== 'transfer' || !isToAccountCreditSelected) {
      form.setValue('is_bill_payment', false, { shouldValidate: true });
    }
  }, [form, transactionKind, isToAccountCreditSelected]);

  // Lock account when card is selected
  useEffect(() => {
    if (linkedAccountId && linkedAccountId !== selectedAccountId) {
      form.setValue('account_id', linkedAccountId, { shouldValidate: true });
    }
  }, [linkedAccountId, selectedAccountId, form]);

  // Reset card-related fields when card is deselected
  useEffect(() => {
    if (!selectedCardId) {
      form.setValue('is_recurring', false, { shouldValidate: true });
      form.setValue('show_installments', false, { shouldValidate: true });
    }
  }, [selectedCardId, form]);

  const toggleTag = (tagId: string) => {
    form.setValue(
      'tag_ids',
      selectedTags.includes(tagId) ? selectedTags.filter((id) => id !== tagId) : [...selectedTags, tagId],
      { shouldDirty: true },
    );
  };

  const resetForm = () => {
    form.reset(createDefaults);
  };

  const handleSubmit = form.handleSubmit(
    (values) => {
      const formData = new FormData();
      formData.set('kind', values.kind ?? '');
      formData.set('description', values.description ?? '');
      formData.set('amount', values.amount ?? '');
      formData.set('occurred_on', values.occurred_on ?? '');
      formData.set('account_id', values.account_id ?? '');
      formData.set('to_account_id', values.to_account_id ?? '');
      formData.set('to_card_id', values.to_card_id ?? '');
      formData.set('category_id', values.category_id ?? '');
      formData.set('card_id', values.card_id ?? '');
      formData.set('notes', values.notes ?? '');
      formData.set('installments', values.installments ?? '');
      formData.set('first_installment_on', values.first_installment_on ?? '');
      formData.set('is_recurring', values.is_recurring ? 'true' : 'false');
      formData.set('recurrence_frequency', values.recurrence_frequency ?? '');
      formData.set('recurrence_interval', values.recurrence_interval ?? '');
      formData.set('recurrence_occurrences', values.recurrence_occurrences ?? '');
      formData.set('recurrence_end_on', values.recurrence_end_on ?? '');
      formData.set('is_bill_payment', values.is_bill_payment ? 'true' : 'false');
      formData.set('is_installment_payment', values.is_installment_payment ? 'true' : 'false');
      formData.set('is_recurring_payment', values.is_recurring_payment ? 'true' : 'false');
      const tagIds = values.tag_ids ?? [];
      tagIds.forEach((tagId: string) => formData.append('tag_ids', tagId));
      startCreating(async () => {
        await createTransaction(formData);
        toast.success('Transação criada.');
        resetForm();
        router.refresh();
        onSuccess?.();
      });
    },
    () => {
      toast.error('Confira os campos antes de salvar.');
    },
  );

  return {
    form,
    transactionKind,
    selectedAccountId,
    selectedCardId,
    isRecurring,
    showInstallments,
    selectedTags,
    isAccountLocked,
    isCreditAccountSelected,
    filteredCardOptions,
    shouldShowCard,
    hasSelectedCard,
    accountTypeMap,
    cardAccountMap,
    toggleTag,
    handleSubmit,
    resetForm,
    isCreating,
    isToAccountCreditSelected,
    filteredToCardOptions,
    shouldShowToCard,
  };
}
