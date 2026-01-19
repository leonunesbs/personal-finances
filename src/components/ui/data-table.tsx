'use client';

import * as React from 'react';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { ColumnDef, ColumnFiltersState, Row, Table as TableInstance } from '@tanstack/react-table';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  searchColumnId?: string;
  searchPlaceholder?: string;
  renderSelectedActions?: (table: TableInstance<TData>) => React.ReactNode;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  onSelectionChange?: (selectedRows: TData[]) => void;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = 'Nenhum resultado.',
  enablePagination = false,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  searchColumnId,
  searchPlaceholder = 'Buscar...',
  renderSelectedActions,
  getRowId,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      rowSelection,
      ...(enablePagination ? { pagination } : {}),
    },
    onColumnFiltersChange: setColumnFilters,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    ...(enablePagination ? { onPaginationChange: setPagination } : {}),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    ...(getRowId ? { getRowId } : {}),
  });

  React.useEffect(() => {
    if (!onSelectionChange) return;
    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
    onSelectionChange(selectedRows);
  }, [onSelectionChange, rowSelection, table]);

  const selectedCount = table.getSelectedRowModel().rows.length;
  const selectionActions = renderSelectedActions?.(table);
  const isSearchEnabled = Boolean(searchColumnId && table.getColumn(searchColumnId));
  const shouldShowToolbar = Boolean(selectionActions) || enablePagination || isSearchEnabled;
  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined;

  return (
    <div className="space-y-3">
      {shouldShowToolbar && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {selectionActions}
            {isSearchEnabled && (
              <Input
                placeholder={searchPlaceholder}
                value={(searchColumn?.getFilterValue() as string) ?? ''}
                onChange={(event) => searchColumn?.setFilterValue(event.target.value)}
                className="h-8 w-full sm:max-w-[240px]"
              />
            )}
            {selectedCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedCount} selecionada{selectedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {enablePagination && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Itens por página</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[96px]">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={`${option}`}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
