"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionImportSheet } from "./components/import-sheet/transaction-import-sheet";
import { TransactionEditDrawer } from "./components/edit-drawer/transaction-edit-drawer";
import { TransactionCreateForm } from "./components/create-form/transaction-create-form";
import { TransactionFilters } from "./components/filters/transaction-filters";
import { TransactionTable } from "./components/table/transaction-table";
import { useTransactionFilters } from "./components/filters/use-transaction-filters";
import { useEditTransaction } from "./components/edit-drawer/use-edit-transaction";
import type { TransactionsClientProps } from "./types";

export function TransactionsClient(props: TransactionsClientProps) {
  const { accounts, categories, cards, tags, transactions, transactionInstallments } = props;

  // Sort transactions by date (newest first)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aDate = new Date(`${a.occurred_on}T00:00:00`);
      const bDate = new Date(`${b.occurred_on}T00:00:00`);
      const aTime = Number.isNaN(aDate.getTime()) ? 0 : aDate.getTime();
      const bTime = Number.isNaN(bDate.getTime()) ? 0 : bDate.getTime();
      return bTime - aTime;
    });
  }, [transactions]);

  // Use filters hook
  const {
    categoryFilter,
    setCategoryFilter,
    kindFilter,
    setKindFilter,
    accountFilter,
    setAccountFilter,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    filteredTransactions,
  } = useTransactionFilters(sortedTransactions);

  // Use edit hook for handling edit actions
  const editHook = useEditTransaction({ accounts, cards, transactions });

  return (
    <div className="space-y-6">
      <TransactionImportSheet accounts={accounts} categories={categories} cards={cards} />

      <TransactionEditDrawer
        accounts={accounts}
        categories={categories}
        cards={cards}
        transactions={transactions}
        editHook={editHook}
      />

      <div className="space-y-6">
        <TransactionCreateForm
          accounts={accounts}
          categories={categories}
          cards={cards}
          tags={tags}
        />

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Lançamentos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Inclui transações efetivadas, lançamentos futuros e parcelas de dívidas.
            </p>
          </CardHeader>
          <CardContent>
            <TransactionFilters
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              kindFilter={kindFilter}
              setKindFilter={setKindFilter}
              accountFilter={accountFilter}
              setAccountFilter={setAccountFilter}
              dateRangeStart={dateRangeStart}
              setDateRangeStart={setDateRangeStart}
              dateRangeEnd={dateRangeEnd}
              setDateRangeEnd={setDateRangeEnd}
              categories={categories}
              accounts={accounts}
            />
            <TransactionTable
              transactions={filteredTransactions}
              transactionInstallments={transactionInstallments}
              accounts={accounts}
              categories={categories}
              cards={cards}
              onEditStart={editHook.handleEditStart}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
