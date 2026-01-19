"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MonthPickerFieldProps = {
  id: string;
  name: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
};

function parseMonthValue(value?: string) {
  if (!value) return { month: "", year: "" };
  const [year, month] = value.split("-");
  if (!year || !month) return { month: "", year: "" };
  return { month, year };
}

function buildMonthValue(month: string, year: string) {
  if (!month || !year) return "";
  const monthNumber = Number.parseInt(month, 10);
  const yearNumber = Number.parseInt(year, 10);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(yearNumber)) return "";
  if (monthNumber < 1 || monthNumber > 12) return "";
  return `${yearNumber}-${String(monthNumber).padStart(2, "0")}`;
}

export function MonthPickerField({
  id,
  name,
  value,
  defaultValue,
  required,
  disabled,
  className,
  onBlur,
  onChange,
  onValueChange,
}: MonthPickerFieldProps) {
  const parsed = parseMonthValue(value ?? defaultValue);
  const [month, setMonth] = React.useState(parsed.month);
  const [year, setYear] = React.useState(parsed.year);

  React.useEffect(() => {
    if (value === undefined) return;
    const next = parseMonthValue(value);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const fieldValue = React.useMemo(() => buildMonthValue(month, year), [month, year]);

  React.useEffect(() => {
    onChange?.(fieldValue);
    onValueChange?.(fieldValue);
  }, [fieldValue, onChange, onValueChange]);

  return (
    <div className={cn("space-y-2", className)}>
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
      <input
        id={`${id}-value`}
        name={name}
        type="text"
        className="sr-only"
        value={fieldValue}
        readOnly
        required={required}
      />
    </div>
  );
}
