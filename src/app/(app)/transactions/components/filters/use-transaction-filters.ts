import { useMemo, useState } from "react";
import { isValid, parseISO } from "date-fns";
import { EMPTY_SELECT_VALUE, FILTER_ALL_VALUE } from "../../constants";
import type { Transaction } from "../../types";

export function useTransactionFilters(transactions: Transaction[]) {
  const [categoryFilter, setCategoryFilter] = useState(FILTER_ALL_VALUE);
  const [kindFilter, setKindFilter] = useState(FILTER_ALL_VALUE);
  const [accountFilter, setAccountFilter] = useState(FILTER_ALL_VALUE);
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  const parseFilterDate = (value?: string) => {
    if (!value) return null;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  };

  const filteredTransactions = useMemo(() => {
    const startDate = parseFilterDate(dateRangeStart);
    const endDate = parseFilterDate(dateRangeEnd);
    const startTime = startDate
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()
      : null;
    const endTime = endDate
      ? new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23,
          59,
          59,
          999
        ).getTime()
      : null;

    return transactions.filter((transaction) => {
      const matchesCategory =
        categoryFilter === FILTER_ALL_VALUE ||
        (categoryFilter === EMPTY_SELECT_VALUE
          ? !transaction.category_id
          : transaction.category_id === categoryFilter);
      const matchesKind = kindFilter === FILTER_ALL_VALUE || transaction.kind === kindFilter;
      const matchesAccount =
        accountFilter === FILTER_ALL_VALUE || transaction.account_id === accountFilter;
      const matchesDateRange = (() => {
        if (!startTime && !endTime) return true;
        const transactionDate = parseFilterDate(transaction.occurred_on);
        if (!transactionDate) return false;
        const transactionTime = transactionDate.getTime();
        if (startTime && transactionTime < startTime) return false;
        if (endTime && transactionTime > endTime) return false;
        return true;
      })();
      return matchesCategory && matchesKind && matchesAccount && matchesDateRange;
    });
  }, [accountFilter, categoryFilter, dateRangeEnd, dateRangeStart, kindFilter, transactions]);

  return {
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
  };
}
