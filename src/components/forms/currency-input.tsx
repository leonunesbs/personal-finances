"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { formatCurrencyInput, formatCurrencyValue } from "@/lib/finance";

type CurrencyInputProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "onChange" | "value" | "defaultValue"> & {
  defaultValue?: number | string;
  value?: string;
  currencyPrefix?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
};

export function CurrencyInput({ defaultValue, value, currencyPrefix = "R$", onChange, onValueChange, ...props }: CurrencyInputProps) {
  const initialValue = useMemo(
    () => formatCurrencyValue(defaultValue, currencyPrefix),
    [defaultValue, currencyPrefix],
  );
  const [internalValue, setInternalValue] = useState(initialValue);
  const displayValue = value ?? internalValue;

  useEffect(() => {
    if (value === undefined) {
      setInternalValue(initialValue);
    }
  }, [initialValue, value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = formatCurrencyInput(event.target.value, currencyPrefix);
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
    onValueChange?.(nextValue);
  };

  return <Input {...props} type="text" inputMode="decimal" value={displayValue} onChange={handleChange} />;
}
