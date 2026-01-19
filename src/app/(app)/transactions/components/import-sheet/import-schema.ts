import { z } from "zod";
import { parseRowsJson } from "../../utils";

export const importTransactionsSchema = (getAccountType: (accountId: string) => string | undefined) =>
  z
    .object({
      csv_file: z.any().optional(),
      account_id: z.string().min(1, "Selecione a conta."),
      card_id: z.string().optional(),
      rows_json: z.string().min(1, "Carregue o CSV."),
    })
    .superRefine((values, ctx) => {
      const rows = parseRowsJson(values.rows_json);
      const hasRows = Boolean(rows && rows.length > 0);
      const fileList = values.csv_file as FileList | File | undefined;
      const file = fileList instanceof FileList ? fileList.item(0) ?? undefined : fileList;
      const shouldFlagCsv = !hasRows && (!(file instanceof File) || file.size === 0);
      if (shouldFlagCsv) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione um arquivo CSV válido.",
          path: ["csv_file"],
        });
      }
      if (!hasRows) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nenhuma linha válida na prévia.",
          path: ["rows_json"],
        });
      }
      const accountType = values.account_id ? getAccountType(values.account_id) : undefined;
      if (accountType === "credit" && !values.card_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione o cartão para conta de crédito.",
          path: ["card_id"],
        });
      }
    });

export type ImportTransactionsFormValues = z.infer<ReturnType<typeof importTransactionsSchema>>;
