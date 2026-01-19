"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import { transactionKindOptions } from "../../constants";
import { parseInstallmentRatio, formatShortDate } from "../../utils";
import type { Account, Category, CardItem, Transaction, TransactionInstallment } from "../../types";

type CreateColumnsProps = {
  accountMap: Map<string, string>;
  categoryMap: Map<string, string>;
  installmentMetaByTransaction: Map<string, { totalInstallments?: number; firstDueOn?: string }>;
  onEditStart: (transaction: Transaction) => void;
};

export function createTransactionColumns({
  accountMap,
  categoryMap,
  installmentMetaByTransaction,
  onEditStart,
}: CreateColumnsProps): ColumnDef<Transaction>[] {
  const transactionKindMap = new Map(transactionKindOptions.map((option) => [option.value, option.label]));

  return [
    {
      id: "select",
      header: ({ table }) => {
        const allRows = table.getRowModel().rows;
        const allSelected = allRows.length > 0 && allRows.every((row) => row.getIsSelected());
        const someSelected = allRows.some((row) => row.getIsSelected());
        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allSelected || (someSelected && "indeterminate")}
              onCheckedChange={(value) => {
                allRows.forEach((row) => row.toggleSelected(!!value));
              }}
              aria-label="Selecionar todas"
            />
          </div>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                row.toggleSelected(!!value);
              }}
              aria-label="Selecionar linha"
            />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "occurred_on",
      header: "Data",
      cell: ({ row }) => {
        const rawDate = row.original.occurred_on;
        if (!rawDate) return "-";
        const parsed = parseISO(rawDate);
        return Number.isNaN(parsed.getTime()) ? rawDate : format(parsed, "dd/MM/yyyy");
      },
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => row.original.description ?? "-",
    },
    {
      accessorKey: "kind",
      header: "Tipo",
      cell: ({ row }) => transactionKindMap.get(row.original.kind) ?? row.original.kind,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const transactionDate = new Date(row.original.occurred_on);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return transactionDate < today ? "Efetivada" : "Futura";
      },
    },
    {
      id: "bill_payment",
      header: "Fatura",
      cell: ({ row }) => (row.original.is_bill_payment ? "Pagamento" : "-"),
    },
    {
      id: "installment_payment",
      header: "Parcela",
      cell: ({ row }) => {
        if (!row.original.is_installment_payment) {
          return "-";
        }
        const installmentMeta = installmentMetaByTransaction.get(row.original.id);
        const ratio = parseInstallmentRatio(row.original.description);
        const totalInstallments = installmentMeta?.totalInstallments ?? ratio?.totalInstallments;
        const firstDueOn = formatShortDate(installmentMeta?.firstDueOn);
        const details = [
          totalInstallments ? `${totalInstallments}x` : null,
          firstDueOn ? `1ª em ${firstDueOn}` : null,
        ].filter(Boolean);
        return details.length > 0 ? `Parcela · ${details.join(" · ")}` : "Parcela";
      },
    },
    {
      id: "recurring_payment",
      header: "Recorrente",
      cell: ({ row }) => (row.original.is_recurring_payment ? "Assinatura" : "-"),
    },
    {
      id: "account",
      header: "Conta",
      cell: ({ row }) => (row.original.account_id ? accountMap.get(row.original.account_id) : "-"),
    },
    {
      id: "category",
      header: "Categoria",
      cell: ({ row }) => (row.original.category_id ? categoryMap.get(row.original.category_id) : "-"),
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <Button variant="ghost" size="sm" onClick={() => onEditStart(row.original)}>
            Editar
          </Button>
        );
      },
    },
  ];
}
