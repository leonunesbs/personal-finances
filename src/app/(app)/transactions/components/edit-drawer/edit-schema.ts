import { z } from "zod";
import { parseAmount } from "@/lib/finance";
import { parsePositiveInt } from "../../utils";

export const editTransactionSchema = (
  getAccountType: (accountId: string) => string | undefined,
  getCardAccountId: (cardId: string) => string | undefined
) =>
  z
    .object({
      occurred_on: z.string().min(1, "Informe a data."),
      description: z.string().optional(),
      kind: z.string().min(1, "Selecione o tipo."),
      account_id: z.string().min(1, "Selecione a conta."),
      to_account_id: z.string().optional(),
      category_id: z.string().optional(),
      card_id: z.string().optional(),
      amount: z.string().min(1, "Informe o valor."),
      is_bill_payment: z.boolean().optional(),
      is_installment_payment: z.boolean().optional(),
      is_recurring_payment: z.boolean().optional(),
      installment_number: z.string().optional(),
      total_installments: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (parseAmount(values.amount) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe um valor positivo.",
          path: ["amount"],
        });
      }
      if (values.kind === "transfer" && !values.to_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione a conta destino.",
          path: ["to_account_id"],
        });
      }
      const accountType = values.account_id ? getAccountType(values.account_id) : undefined;
      if (accountType === "credit" && !values.card_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione o cartão da conta de crédito.",
          path: ["card_id"],
        });
      }
      if (values.card_id && values.account_id) {
        const linkedAccount = getCardAccountId(values.card_id);
        if (linkedAccount && linkedAccount !== values.account_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cartão não pertence à conta selecionada.",
            path: ["card_id"],
          });
        }
      }
      const installmentNumber = parsePositiveInt(values.installment_number);
      const totalInstallments = parsePositiveInt(values.total_installments);
      if (values.installment_number && !installmentNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Parcela atual inválida.",
          path: ["installment_number"],
        });
      }
      if (values.total_installments && !totalInstallments) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total de parcelas inválido.",
          path: ["total_installments"],
        });
      }
      if (installmentNumber && totalInstallments && installmentNumber > totalInstallments) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A parcela atual não pode ser maior que o total.",
          path: ["installment_number"],
        });
      }
    });

export type EditTransactionFormValues = z.infer<ReturnType<typeof editTransactionSchema>>;
