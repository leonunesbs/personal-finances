import { requireUser } from '@/lib/supabase/auth';

import { TransactionsClient } from './transactions-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export default async function TransactionsPage() {
  const { supabase } = await requireUser();

  const transactions = await supabase
    .from('transactions')
    .select('*')
    .order('occurred_on', { ascending: false })
    .limit(50);
  const transactionIds = (transactions.data ?? []).map((transaction) => transaction.id);
  const transactionInstallmentsPromise = transactionIds.length
    ? supabase
        .from('transaction_installments')
        .select('*')
        .in('transaction_id', transactionIds)
        .order('due_on', { ascending: true })
    : Promise.resolve({ data: [] });

  const [accounts, categories, cards, tags, transactionInstallments] = await Promise.all([
    supabase.from('accounts').select('*').order('created_at'),
    supabase.from('categories').select('*').order('created_at'),
    supabase.from('cards').select('*').order('created_at'),
    supabase.from('tags').select('*').order('created_at'),
    transactionInstallmentsPromise,
  ]);

  return (
    <TransactionsClient
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      cards={cards.data ?? []}
      tags={tags.data ?? []}
      transactions={transactions.data ?? []}
      transactionInstallments={transactionInstallments.data ?? []}
    />
  );
}
