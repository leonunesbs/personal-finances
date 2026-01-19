'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { deleteTransactions } from '../../actions';
import { createTransactionColumns } from './transaction-columns';

import type { Account, Category, CardItem, Transaction, TransactionInstallment } from '../../types';

type TransactionTableProps = {
  transactions: Transaction[];
  transactionInstallments: TransactionInstallment[];
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  onEditStart: (transaction: Transaction) => void;
};

export function TransactionTable(props: TransactionTableProps) {
  const { transactions, transactionInstallments, accounts, categories, onEditStart } = props;
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const router = useRouter();

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const installmentMetaByTransaction = useMemo(() => {
    const meta = new Map<string, { totalInstallments?: number; firstDueOn?: string }>();
    for (const installment of transactionInstallments) {
      const existing = meta.get(installment.transaction_id);
      const totalInstallments = installment.total_installments || existing?.totalInstallments;
      let firstDueOn = existing?.firstDueOn;
      if (!firstDueOn) {
        firstDueOn = installment.due_on;
      } else {
        const current = new Date(firstDueOn);
        const candidate = new Date(installment.due_on);
        if (!isNaN(candidate.getTime()) && (!isNaN(current.getTime()) || candidate < current)) {
          firstDueOn = installment.due_on;
        }
      }
      meta.set(installment.transaction_id, { totalInstallments, firstDueOn });
    }
    return meta;
  }, [transactionInstallments]);

  const columns = useMemo(
    () =>
      createTransactionColumns({
        accountMap,
        categoryMap,
        installmentMetaByTransaction,
        onEditStart,
      }),
    [accountMap, categoryMap, installmentMetaByTransaction, onEditStart],
  );

  const selectedTransactionIds = useMemo(
    () => selectedTransactions.map((transaction) => transaction.id),
    [selectedTransactions],
  );

  const totalSelectedCount = selectedTransactionIds.length;

  const selectedSummaryLabel = useMemo(() => {
    if (selectedTransactionIds.length === 0) {
      return '0 transações';
    }
    return `${selectedTransactionIds.length} transa${selectedTransactionIds.length > 1 ? 'ções' : 'ção'}`;
  }, [selectedTransactionIds.length]);

  const hasFutureLinkedSelected = useMemo(
    () =>
      selectedTransactions.some((transaction) =>
        transactions.some((t) => t.parent_transaction_id === transaction.id && new Date(t.occurred_on) > new Date()),
      ),
    [selectedTransactions, transactions],
  );

  const handleSelectionChange = (rows: Transaction[]) => {
    setSelectedTransactions(rows);
  };

  const handleDeleteSelected = (deleteFuture: boolean) => {
    if (selectedTransactionIds.length === 0) return;
    startDeleting(async () => {
      const result = await deleteTransactions(selectedTransactionIds, { deleteFuture });
      if (!result?.ok) {
        toast.error(result?.message ?? 'Erro ao excluir transações.');
        return;
      }
      if ('warning' in result && result.warning) {
        toast(String(result.warning));
      }
      toast.success(
        `${selectedTransactionIds.length} transa${selectedTransactionIds.length > 1 ? 'ções' : 'ção'} excluída${selectedTransactionIds.length > 1 ? 's' : ''}.`,
      );
      setIsDeleteOpen(false);
      setSelectedTransactions([]);
      router.refresh();
    });
  };

  return (
    <DataTable
      columns={columns}
      data={transactions}
      emptyMessage="Nenhuma transação encontrada."
      enablePagination
      initialPageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
      getRowId={(row) => row.id}
      onSelectionChange={handleSelectionChange}
      renderSelectedActions={() => (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={totalSelectedCount === 0 || isDeleting}>
              Excluir selecionadas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir itens selecionados?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a excluir {selectedSummaryLabel}. Esta ação não pode ser desfeita.
                {hasFutureLinkedSelected ? ' Existem lançamentos futuros relacionados.' : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              {hasFutureLinkedSelected ? (
                <>
                  <AlertDialogAction
                    onClick={() => handleDeleteSelected(false)}
                    disabled={totalSelectedCount === 0 || isDeleting}
                  >
                    {isDeleting ? 'Excluindo...' : 'Excluir e manter futuros'}
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => handleDeleteSelected(true)}
                    disabled={totalSelectedCount === 0 || isDeleting}
                  >
                    {isDeleting ? 'Excluindo...' : 'Excluir também futuros'}
                  </AlertDialogAction>
                </>
              ) : (
                <AlertDialogAction
                  onClick={() => handleDeleteSelected(false)}
                  disabled={totalSelectedCount === 0 || isDeleting}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    />
  );
}
