'use client';

import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import type { FocusEventHandler } from 'react';

type MonthYearFieldProps = {
  id: string;
  name: string;
  defaultValue?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
};

function parseMonthYear(value?: string) {
  if (!value) {
    return { month: '', year: '' };
  }
  const [year, month] = value.split('-');
  if (!year || !month) {
    return { month: '', year: '' };
  }
  return { month, year };
}

function buildMonthYearValue(month: string, year: string) {
  if (!month || !year) return '';
  const monthNumber = Number.parseInt(month, 10);
  const yearNumber = Number.parseInt(year, 10);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(yearNumber)) return '';
  if (monthNumber < 1 || monthNumber > 12) return '';
  return `${yearNumber}-${String(monthNumber).padStart(2, '0')}-01`;
}

export function MonthYearField({
  id,
  name,
  defaultValue,
  value,
  required,
  disabled,
  className,
  onBlur,
  onChange,
  onValueChange,
}: MonthYearFieldProps) {
  const parsed = parseMonthYear(value ?? defaultValue);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  // Sync state when value prop changes (controlled mode)
  useEffect(() => {
    if (value === undefined) return;
    const next = parseMonthYear(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonth(next.month);

    setYear(next.year);
  }, [value]);

  const hiddenValue = useMemo(() => buildMonthYearValue(month, year), [month, year]);
  const inputValue = value ?? hiddenValue;

  useEffect(() => {
    onChange?.(hiddenValue);
    onValueChange?.(hiddenValue);
  }, [hiddenValue, onChange, onValueChange]);

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="grid grid-cols-2 gap-2">
        <Input
          id={`${id}-month`}
          name={`${name}_month`}
          type="number"
          inputMode="numeric"
          min={1}
          max={12}
          placeholder="Mês"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
        />
        <Input
          id={`${id}-year`}
          name={`${name}_year`}
          type="number"
          inputMode="numeric"
          min={1900}
          max={2100}
          placeholder="Ano"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
        />
      </div>
      <input id={id} name={name} type="hidden" value={inputValue} readOnly required={required} />
    </div>
  );
}
