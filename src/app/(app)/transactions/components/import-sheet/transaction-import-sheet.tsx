"use client";

import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SelectField } from "@/components/forms/select-field";
import { formatCurrency } from "@/lib/finance";
import { useImportTransactions } from "./use-import-transactions";
import type { Account, Category, CardItem } from "../../types";

type TransactionImportSheetProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
};

export function TransactionImportSheet(props: TransactionImportSheetProps) {
  const { accounts, categories, cards } = props;

  const {
    form,
    isOpen,
    setIsOpen,
    fileName,
    rows,
    error,
    isParsingFile,
    isSuggestingActive,
    suggestingProgress,
    suggestProgressPercent,
    importPage,
    setImportPage,
    importTotalPages,
    pagedImportRows,
    isImporting,
    importAccountId,
    importCardId,
    importIsCreditAccount,
    importCardOptions,
    accountTypeMap,
    handleImportFileChange,
    handleImportSubmit,
    handleRefreshCategories,
    handleRowCategoryChange,
  } = useImportTransactions({ accounts, categories, cards });

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const importErrors = form.formState.errors;
  const importCsvMessage = importErrors.csv_file?.message as string | undefined;
  const importRowsMessage = importErrors.rows_json?.message as string | undefined;
  const importAccountMessage = (importErrors.account_id?.message ?? importErrors.card_id?.message) as
    | string
    | undefined;

  const csvFileField = form.register("csv_file", {
    onChange: handleImportFileChange,
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm">Registre receitas, despesas, transferências e investimentos.</p>
        </div>
        <SheetTrigger asChild>
          <Button variant="outline">Importar CSV de cartão</Button>
        </SheetTrigger>
      </div>
      <SheetContent className="flex h-full w-full flex-col sm:max-w-xl">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SheetHeader>
            <SheetTitle>Importar CSV de cartão</SheetTitle>
            <SheetDescription>
              Envie um CSV da fatura no formato date,title,amount e revise cartão, conta e categoria antes de importar.
            </SheetDescription>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col gap-6 pr-1" onSubmit={handleImportSubmit}>
            <div className="space-y-2">
              <Label htmlFor="csv_file">Arquivo CSV da fatura</Label>
              <Input
                id="csv_file"
                type="file"
                accept=".csv,text/csv"
                {...csvFileField}
              />
              {importCsvMessage && !isParsingFile && rows.length === 0 && (
                <p className="text-xs text-destructive">{importCsvMessage}</p>
              )}
              {fileName ? (
                <p className="text-xs text-muted-foreground">Arquivo: {fileName}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Selecione o arquivo exportado da fatura do cartão.</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <SelectField
                    name="account_id"
                    label="Conta"
                    options={accountOptions}
                    value={field.value ?? ""}
                    onValueChange={(nextAccountId) => {
                      field.onChange(nextAccountId);
                      if (accountTypeMap.get(nextAccountId) !== "credit") {
                        form.setValue("card_id", "", { shouldValidate: true });
                      }
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="card_id"
                render={({ field }) => (
                  <SelectField
                    name="card_id"
                    label="Cartão"
                    options={importCardOptions}
                    placeholder={importIsCreditAccount ? "Obrigatório" : "Selecione a conta"}
                    value={field.value ?? ""}
                    disabled={!importAccountId || !importIsCreditAccount}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {importAccountMessage && (
                <p className="text-xs text-destructive md:col-span-2">{importAccountMessage}</p>
              )}
              {importIsCreditAccount && importAccountId && importCardOptions.length === 0 && (
                <p className="text-xs text-destructive md:col-span-2">
                  Nenhum cartão disponível para importar.
                </p>
              )}
            </div>
            {importRowsMessage && <p className="text-xs text-destructive">{importRowsMessage}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {rows.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">Prévia das linhas</p>
                    <p className="text-xs text-muted-foreground">
                      {rows.length} linhas encontradas
                    </p>
                    {isSuggestingActive && suggestingProgress.total > 0 && (
                      <p className="text-xs text-muted-foreground">
                        IA categorizando {suggestingProgress.completed} de {suggestingProgress.total} ({suggestProgressPercent}
                        %)
                      </p>
                    )}
                    {isSuggestingActive && suggestingProgress.total === 0 && (
                      <p className="text-xs text-muted-foreground">IA categorizando...</p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleRefreshCategories} disabled={isSuggestingActive}>
                    {isSuggestingActive ? "Atualizando..." : "Renovar IA"}
                  </Button>
                </div>
                <div className="min-h-[240px] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedImportRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.title}</TableCell>
                          <TableCell>
                            <Select
                              value={row.categoryId ?? ""}
                              onValueChange={(value) => handleRowCategoryChange(row.id, value)}
                            >
                              <SelectTrigger className="min-w-[180px]">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="max-h-56 overflow-y-auto">
                                {categoryOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={importPage === 1}
                    onClick={() => setImportPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {importPage} de {importTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={importPage === importTotalPages}
                    onClick={() => setImportPage((prev) => Math.min(importTotalPages, prev + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
            <SheetFooter className="mt-auto">
              <Button
                type="submit"
                disabled={
                  isImporting ||
                  !fileName ||
                  !importAccountId ||
                  !importCardId ||
                  rows.length === 0
                }
              >
                {isImporting ? "Importando..." : "Importar transações"}
              </Button>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
