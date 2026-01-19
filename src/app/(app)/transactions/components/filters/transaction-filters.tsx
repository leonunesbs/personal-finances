'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerField } from '@/components/forms/date-picker-field';

import { EMPTY_SELECT_VALUE, FILTER_ALL_VALUE, transactionKindOptions } from '../../constants';

import type { Account, Category } from '../../types';

type TransactionFiltersProps = {
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  kindFilter: string;
  setKindFilter: (value: string) => void;
  accountFilter: string;
  setAccountFilter: (value: string) => void;
  dateRangeStart: string;
  setDateRangeStart: (value: string) => void;
  dateRangeEnd: string;
  setDateRangeEnd: (value: string) => void;
  categories: Category[];
  accounts: Account[];
};

export function TransactionFilters(props: TransactionFiltersProps) {
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
    categories,
    accounts,
  } = props;

  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-5">
      <div className="space-y-1">
        <Label htmlFor="filter-category">Categoria</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger id="filter-category">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value={FILTER_ALL_VALUE}>Todas</SelectItem>
            <SelectItem value={EMPTY_SELECT_VALUE}>Sem categoria</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-kind">Tipo</Label>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger id="filter-kind">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL_VALUE}>Todos</SelectItem>
            {transactionKindOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-account">Conta</Label>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger id="filter-account">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value={FILTER_ALL_VALUE}>Todas</SelectItem>
            {accountOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-start-date">De</Label>
        <DatePickerField
          id="filter-start-date"
          name="filter-start-date"
          value={dateRangeStart}
          onChange={setDateRangeStart}
          placeholder="Data inicial"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-end-date">Até</Label>
        <DatePickerField
          id="filter-end-date"
          name="filter-end-date"
          value={dateRangeEnd}
          onChange={setDateRangeEnd}
          placeholder="Data final"
        />
      </div>
    </div>
  );
}
