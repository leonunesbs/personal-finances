import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';

export const EMPTY_SELECT_VALUE = '__none__';
export const FILTER_ALL_VALUE = '__all__';

export const transactionKindOptions = [
  {
    value: 'income',
    label: 'Receita',
    description: 'Entradas como salário ou vendas.',
    icon: ArrowDownLeft,
  },
  {
    value: 'expense',
    label: 'Despesa',
    description: 'Saídas do dia a dia e contas.',
    icon: ArrowUpRight,
  },
  {
    value: 'transfer',
    label: 'Transferência',
    description: 'Movimente entre suas contas.',
    icon: ArrowLeftRight,
  },
  {
    value: 'investment_contribution',
    label: 'Aporte',
    description: 'Aplique em investimentos.',
    icon: TrendingUp,
  },
  {
    value: 'investment_withdrawal',
    label: 'Resgate',
    description: 'Retire do investimento.',
    icon: TrendingDown,
  },
];

export const recurrenceOptions = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];
