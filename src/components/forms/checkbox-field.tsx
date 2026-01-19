"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CheckboxFieldProps = {
  name: string;
  label: string;
  defaultChecked?: boolean;
};

export function CheckboxField({ name, label, defaultChecked }: CheckboxFieldProps) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => setChecked(Boolean(value))} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
