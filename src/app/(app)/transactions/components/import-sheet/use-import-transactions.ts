import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";
import { parseAmount } from "@/lib/finance";
import { normalizeImportDescription } from "../../utils";
import { importTransactionsSchema, type ImportTransactionsFormValues } from "./import-schema";
import { importTransactions, suggestImportCategories } from "../../actions";
import type { ImportRow } from "./import-types";
import type { Account, Category, CardItem } from "../../types";

type UseImportTransactionsProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
};

export function useImportTransactions({ accounts, categories, cards }: UseImportTransactionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isCategorizingImport, setIsCategorizingImport] = useState(false);
  const [suggestingProgress, setSuggestingProgress] = useState({ completed: 0, total: 0 });
  const [importPage, setImportPage] = useState(1);
  const [isImporting, startImport] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();

  const accountTypeMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.type])),
    [accounts]
  );

  const categoryIdByName = useMemo(
    () => new Map(categories.map((category) => [category.name, category.id])),
    [categories]
  );

  const importSchema = useMemo(
    () => importTransactionsSchema((accountId) => accountTypeMap.get(accountId)),
    [accountTypeMap]
  );

  const form = useForm<ImportTransactionsFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      csv_file: undefined,
      account_id: "",
      card_id: "",
      rows_json: "",
    },
  });

  const importAccountId = useWatch({ control: form.control, name: "account_id" });
  const importCardId = useWatch({ control: form.control, name: "card_id" });

  const importIsCreditAccount = Boolean(importAccountId) && accountTypeMap.get(importAccountId) === "credit";

  const importCardOptions = useMemo(() => {
    if (!importIsCreditAccount || !importAccountId) {
      return [];
    }
    return cards
      .filter((card) => card.account_id === importAccountId)
      .map((card) => ({ value: card.id, label: card.name }));
  }, [cards, importAccountId, importIsCreditAccount]);

  const importTotalPages = Math.max(1, Math.ceil(rows.length / 10));
  const importPageStart = (importPage - 1) * 10;
  const pagedImportRows = rows.slice(importPageStart, importPageStart + 10);

  const isSuggestingActive = isSuggesting || isCategorizingImport;
  const suggestProgressPercent =
    suggestingProgress.total > 0
      ? Math.round((suggestingProgress.completed / suggestingProgress.total) * 100)
      : 0;

  const applyCategorySuggestions = (suggestions: Record<string, string>) => {
    const normalizedSuggestions = new Map<string, string>();
    for (const [description, category] of Object.entries(suggestions)) {
      normalizedSuggestions.set(normalizeImportDescription(description), category);
    }
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H10",
        location: "transactions/import-sheet/use-import-transactions:applyCategorySuggestions:before",
        message: "Apply category suggestions",
        data: {
          suggestionsCount: Object.keys(suggestions).length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setRows((prev) => {
      const nextRows = prev.map((row) => {
        const suggestedName = normalizedSuggestions.get(normalizeImportDescription(row.title));
        if (!suggestedName) return row;
        const suggestedId = categoryIdByName.get(suggestedName);
        return {
          ...row,
          categoryId: suggestedId ?? row.categoryId,
        };
      });
      form.setValue("rows_json", JSON.stringify(nextRows), { shouldValidate: true });
      return nextRows;
    });
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H10",
        location: "transactions/import-sheet/use-import-transactions:applyCategorySuggestions:after",
        message: "Applied category suggestions",
        data: {
          suggestionsCount: Object.keys(suggestions).length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  };

  const requestCategorySuggestions = async (targetRows: ImportRow[]) => {
    if (targetRows.length === 0 || categories.length === 0) {
      setSuggestingProgress({ completed: 0, total: 0 });
      return;
    }
    const uniqueDescriptionsByKey = new Map<string, string>();
    for (const row of targetRows) {
      if (!row.title) continue;
      const key = normalizeImportDescription(row.title);
      if (!key) continue;
      if (!uniqueDescriptionsByKey.has(key)) {
        uniqueDescriptionsByKey.set(key, row.title);
      }
    }
    const uniqueDescriptions = Array.from(uniqueDescriptionsByKey.values());
    if (uniqueDescriptions.length === 0) {
      setSuggestingProgress({ completed: 0, total: 0 });
      return;
    }
    const categoriesList = categories.map((cat) => cat.name);
    const batchSize = 25;
    let completed = 0;
    setSuggestingProgress({ completed, total: uniqueDescriptions.length });
    for (let start = 0; start < uniqueDescriptions.length; start += batchSize) {
      const batch = uniqueDescriptions.slice(start, start + batchSize);
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "pre-fix",
          hypothesisId: "H9",
          location: "transactions/import-sheet/use-import-transactions:requestCategorySuggestions:batch",
          message: "Category suggestions batch request",
          data: {
            batchStart: start,
            batchSize: batch.length,
            total: uniqueDescriptions.length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const result = await suggestImportCategories(batch, categoriesList);
      if (result?.error) {
        setError(result.error);
        break;
      }
      if (result?.suggestions) {
        applyCategorySuggestions(result.suggestions);
      }
      completed = Math.min(uniqueDescriptions.length, start + batch.length);
      setSuggestingProgress({ completed, total: uniqueDescriptions.length });
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError("");
    setRows([]);
    setSuggestingProgress({ completed: 0, total: 0 });
    setIsParsingFile(true);
    form.setValue("csv_file", event.target.files ?? undefined, { shouldValidate: true });
    form.setValue("rows_json", "", { shouldValidate: true });
    if (!file) {
      setFileName("");
      setIsParsingFile(false);
      return;
    }
    setFileName(file.name);
    const content = await file.text();
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setError("CSV vazio ou sem dados.");
      setIsParsingFile(false);
      return;
    }
    const headers = lines[0]!.split(",").map((header) => header.trim().toLowerCase());
    const dateIndex = headers.indexOf("date");
    const titleIndex = headers.indexOf("title");
    const amountIndex = headers.indexOf("amount");
    if (dateIndex === -1 || titleIndex === -1 || amountIndex === -1) {
      setError("Cabeçalhos esperados: date,title,amount.");
      setIsParsingFile(false);
      return;
    }
    const preview: ImportRow[] = [];
    let rowId = 0;
    for (const line of lines.slice(1)) {
      const values = line.split(",");
      const rawDate = values[dateIndex]?.trim() ?? "";
      const title = values[titleIndex]?.trim() ?? "";
      const amountRaw = values[amountIndex]?.trim() ?? "";
      const amount = parseAmount(amountRaw);
      if (!rawDate || !title || amount === 0) {
        continue;
      }
      const parsedDate = parseISO(rawDate);
      const date = Number.isNaN(parsedDate.getTime()) ? rawDate : format(parsedDate, "dd/MM/yyyy");
      preview.push({ id: rowId, date, title, amount });
      rowId += 1;
    }
    if (preview.length === 0) {
      setError("Nenhuma linha válida para prévia.");
      setIsParsingFile(false);
      return;
    }
    setImportPage(1);
    setRows(preview);
    form.setValue("rows_json", JSON.stringify(preview), { shouldValidate: true });
    form.clearErrors(["csv_file", "rows_json"]);
    setIsParsingFile(false);
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "transactions/import-sheet/use-import-transactions:handleImportFileChange:preview",
        message: "CSV preview built",
        data: {
          previewCount: preview.length,
          rowsJsonLength: JSON.stringify(preview).length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H11",
        location: "transactions/import-sheet/use-import-transactions:handleImportFileChange:preview",
        message: "Preview rows loaded",
        data: { previewCount: preview.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setIsCategorizingImport(true);
    startSuggesting(async () => {
      await requestCategorySuggestions(preview);
      setIsCategorizingImport(false);
    });
  };

  const handleImportSubmit = form.handleSubmit(
    (values) => {
      setError("");
      const formData = new FormData();
      const fileList = values.csv_file as FileList | File | undefined;
      const file = fileList instanceof FileList ? fileList.item(0) ?? undefined : fileList;
      if (file) {
        formData.set("csv_file", file);
      }
      formData.set("account_id", values.account_id ?? "");
      formData.set("card_id", values.card_id ?? "");
      formData.set("rows_json", values.rows_json ?? "");
      startImport(async () => {
        const result = await importTransactions(formData);
        if (!result?.ok) {
          toast.error(result?.message ?? "Erro ao importar transações.");
          return;
        }
        toast.success(`Importadas ${result.imported} transações.`);
        setIsOpen(false);
        setFileName("");
        setRows([]);
        form.reset({
          csv_file: undefined,
          account_id: "",
          card_id: "",
          rows_json: "",
        });
        router.refresh();
      });
    },
    () => {
      toast.error("Confira os campos antes de importar.");
    }
  );

  const handleRefreshCategories = () => {
    setIsCategorizingImport(true);
    startSuggesting(async () => {
      await requestCategorySuggestions(rows);
      setIsCategorizingImport(false);
    });
  };

  const handleRowCategoryChange = (rowId: number, categoryId: string) => {
    setRows((prev) => {
      const nextRows = prev.map((item) =>
        item.id === rowId ? { ...item, categoryId } : item
      );
      form.setValue("rows_json", JSON.stringify(nextRows), { shouldValidate: true });
      return nextRows;
    });
  };

  return {
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
  };
}
