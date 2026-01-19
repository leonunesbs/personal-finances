"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CheckboxFieldProps = {
  name: string;
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
};

export function CheckboxField({
  name,
  label,
  checked,
  defaultChecked,
  disabled,
  onChange,
  onCheckedChange,
}: CheckboxFieldProps) {
  const id = useId();
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const currentChecked = checked ?? internalChecked;

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={currentChecked ? "true" : "false"} />
      <Checkbox
        id={id}
        checked={currentChecked}
        disabled={disabled}
        onCheckedChange={(value) => {
          const nextChecked = Boolean(value);
          if (checked === undefined) {
            setInternalChecked(nextChecked);
          }
          onChange?.(nextChecked);
          onCheckedChange?.(nextChecked);
        }}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
