'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxFieldProps = {
  name: string;
  label: string;
  options: ComboboxOption[];
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  required?: boolean;
};

export function ComboboxField({
  name,
  label,
  options,
  placeholder = 'Selecione',
  value,
  disabled,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  onValueChange,
  className,
  required,
}: ComboboxFieldProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  const selectedOption = options.find((option) => option.value === value);

  // Create a map to convert search value (label) back to actual value (id)
  const labelToValueMap = React.useMemo(
    () => new Map(options.map((option) => [option.label.toLowerCase(), option.value])),
    [options],
  );

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <input type="hidden" name={name} value={value ?? ''} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-9" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    keywords={[option.label]}
                    onSelect={(currentLabel) => {
                      const selectedValue = labelToValueMap.get(currentLabel.toLowerCase());
                      if (selectedValue) {
                        const newValue = selectedValue === value ? '' : selectedValue;
                        onValueChange?.(newValue);
                      }
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    <Check
                      className={cn('ml-auto h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
