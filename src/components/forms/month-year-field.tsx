"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MonthYearFieldProps = {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

function parseMonthYear(value?: string) {
  if (!value) {
    return { month: "", year: "" };
  }
  const [year, month] = value.split("-");
  if (!year || !month) {
    return { month: "", year: "" };
  }
  return { month, year };
}

function buildMonthYearValue(month: string, year: string) {
  if (!month || !year) return "";
  const monthNumber = Number.parseInt(month, 10);
  const yearNumber = Number.parseInt(year, 10);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(yearNumber)) return "";
  if (monthNumber < 1 || monthNumber > 12) return "";
  return `${yearNumber}-${String(monthNumber).padStart(2, "0")}-01`;
}

export function MonthYearField({
  id,
  name,
  defaultValue,
  required,
  disabled,
  className,
}: MonthYearFieldProps) {
  const parsed = parseMonthYear(defaultValue);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  const hiddenValue = useMemo(() => buildMonthYearValue(month, year), [month, year]);

  return (
    <div className={cn("grid gap-2", className)}>
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
          required={required}
          disabled={disabled}
        />
      </div>
      <input
        id={id}
        name={name}
        type="hidden"
        value={hiddenValue}
        readOnly
        required={required}
      />
    </div>
  );
}
