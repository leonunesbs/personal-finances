"use client"

import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { isValid, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ptBR } from "date-fns/locale"

type DatePickerFieldProps = {
  id: string
  name: string
  defaultValue?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DatePickerField({
  id,
  name,
  defaultValue,
  required,
  disabled,
  placeholder = "Selecione a data",
  className,
}: DatePickerFieldProps) {
  const timeZone = "America/Sao_Paulo"
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!defaultValue) return undefined
    const parsed = parseISO(defaultValue)
    return isValid(parsed) ? parsed : undefined
  })

  const fieldValue = date
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date)
    : ""
  const displayValue = date
    ? new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "long" }).format(
        date
      )
    : null

  return (
    <div className={cn("space-y-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!date}
            className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue ? displayValue : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            captionLayout="dropdown"
            locale={ptBR}
            autoFocus
          />
        </PopoverContent>
      </Popover>
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
  )
}
