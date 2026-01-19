"use client";

import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

export function SelectField({
  name,
  label,
  options,
  placeholder,
  defaultValue,
  value,
  disabled,
  onValueChange,
}: SelectFieldProps) {
  const id = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  const handleValueChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} value={currentValue} />
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger id={id} disabled={disabled}>
          <SelectValue placeholder={placeholder ?? "Selecione"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
