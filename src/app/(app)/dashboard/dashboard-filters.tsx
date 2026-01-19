"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

type DashboardFiltersProps = {
  selectedYear: number;
  selectedMonth: number;
  yearOptions: number[];
  monthOptions: { value: number; label: string }[];
};

export function DashboardFilters({ selectedYear, selectedMonth, yearOptions, monthOptions }: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = React.useCallback(
    (next: { month?: number; year?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.month) {
        params.set("month", next.month.toString());
      }
      if (next.year) {
        params.set("year", next.year.toString());
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const getMonthHref = React.useCallback(
    (month: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month.toString());
      params.set("year", selectedYear.toString());
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams, selectedYear]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="dashboard-year" className="text-xs font-medium text-muted-foreground">
          Ano
        </label>
        <select
          id="dashboard-year"
          name="year"
          value={selectedYear}
          onChange={(event) => updateParams({ year: Number(event.target.value) })}
          className="h-9 min-w-[96px] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Mês</span>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-muted/40 p-1">
          {monthOptions.map((month) => {
            const isActive = selectedMonth === month.value;
            return (
              <Link
                key={month.value}
                href={getMonthHref(month.value)}
                className={`flex h-8 min-w-[44px] items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70"
                }`}
              >
                {month.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
