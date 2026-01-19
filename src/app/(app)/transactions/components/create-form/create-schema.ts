import { z } from "zod";
import { parseAmount } from "@/lib/finance";
import { parsePositiveInt } from "../../utils";

export const createTransactionSchema = (
  getAccountType: (accountId: string) => string | undefined,
  getCardAccountId: (cardId: string) => string | undefined
) =>
  z
    .object({
      kind: z.string().min(1, "Selecione o tipo."),
      description: z.string().optional(),
      amount: z.string().optional(),
      occurred_on: z.string().optional(),
      account_id: z.string().optional(),
      to_account_id: z.string().optional(),
      to_card_id: z.string().optional(),
      category_id: z.string().optional(),
      card_id: z.string().optional(),
      notes: z.string().optional(),
      installments: z.string().optional(),
      first_installment_on: z.string().optional(),
      is_recurring: z.boolean().optional(),
      recurrence_frequency: z.string().optional(),
      recurrence_interval: z.string().optional(),
      recurrence_occurrences: z.string().optional(),
      recurrence_end_on: z.string().optional(),
      tag_ids: z.array(z.string()).optional(),
      show_installments: z.boolean().optional(),
      is_bill_payment: z.boolean().optional(),
      is_installment_payment: z.boolean().optional(),
      is_recurring_payment: z.boolean().optional(),
    })
    .superRefine((values, ctx) => {
      if (!values.amount || parseAmount(values.amount) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe um valor positivo.",
          path: ["amount"],
        });
      }
      if (!values.occurred_on) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe a data.",
          path: ["occurred_on"],
        });
      }
      if (!values.account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione a conta.",
          path: ["account_id"],
        });
      }

      if (values.kind === "transfer" && !values.to_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione a conta destino.",
          path: ["to_account_id"],
        });
      }
      
      // Validate to_card_id if to_account is credit
      const toAccountType = values.to_account_id ? getAccountType(values.to_account_id) : undefined;
      if (toAccountType === "credit" && !values.to_card_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione o cartão da conta destino.",
          path: ["to_card_id"],
        });
      }
      if (values.to_card_id && values.to_account_id) {
        const linkedAccount = getCardAccountId(values.to_card_id);
        if (linkedAccount && linkedAccount !== values.to_account_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cartão não pertence à conta destino selecionada.",
            path: ["to_card_id"],
          });
        }
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
      if (values.show_installments) {
        const installmentsNumber = parsePositiveInt(values.installments);
        
        if (!values.installments || !installmentsNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Número de parcelas é obrigatório quando parcelamento está ativado.",
            path: ["installments"],
          });
        } else if (installmentsNumber < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O parcelamento deve ter no mínimo 2 parcelas.",
            path: ["installments"],
          });
        }
        
        if (!values.first_installment_on || values.first_installment_on.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Data da primeira parcela é obrigatória quando parcelamento está ativado.",
            path: ["first_installment_on"],
          });
        }
      }
      if (values.is_recurring) {
        if (!values.recurrence_frequency) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selecione a frequência.",
            path: ["recurrence_frequency"],
          });
        }
        if (!parsePositiveInt(values.recurrence_interval)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe o intervalo da recorrência.",
            path: ["recurrence_interval"],
          });
        }
        if (values.recurrence_occurrences && !parsePositiveInt(values.recurrence_occurrences)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Ocorrências inválidas.",
            path: ["recurrence_occurrences"],
          });
        }
      }
    });

export type CreateTransactionFormValues = z.infer<ReturnType<typeof createTransactionSchema>>;
