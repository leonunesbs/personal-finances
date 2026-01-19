"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { formatCurrencyInput, formatCurrencyValue } from "@/lib/finance";

type CurrencyInputProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "onChange" | "value" | "defaultValue"> & {
  defaultValue?: number | string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function CurrencyInput({ defaultValue, value, onValueChange, ...props }: CurrencyInputProps) {
  const initialValue = useMemo(() => formatCurrencyValue(defaultValue), [defaultValue]);
  const [internalValue, setInternalValue] = useState(initialValue);
  const displayValue = value ?? internalValue;

  useEffect(() => {
    if (value === undefined) {
      setInternalValue(initialValue);
    }
  }, [initialValue, value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = formatCurrencyInput(event.target.value);
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return <Input {...props} type="text" inputMode="decimal" value={displayValue} onChange={handleChange} />;
}
