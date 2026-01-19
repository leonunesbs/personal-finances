"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CheckboxFieldProps = {
  name: string;
  label: string;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function CheckboxField({ name, label, defaultChecked, onCheckedChange }: CheckboxFieldProps) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => {
          const nextChecked = Boolean(value);
          setChecked(nextChecked);
          onCheckedChange?.(nextChecked);
        }}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
