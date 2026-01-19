import { z } from 'zod';

// Enums
export const accountTypeEnum = z.enum(['checking', 'savings', 'credit', 'investment']);
export const transactionKindEnum = z.enum([
  'income',
  'expense',
  'transfer',
  'investment_contribution',
  'investment_withdrawal',
]);

// Zod schemas
export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string(), // Could be accountTypeEnum if backend validates
});

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export const cardItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  account_id: z.string().uuid().nullable(),
});

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export const transactionSchema = z.object({
  id: z.string().uuid(),
  description: z.string().nullable(),
  amount: z.number(),
  occurred_on: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // ISO date or date string
  kind: z.string(), // Could be transactionKindEnum if backend validates
  account_id: z.string().uuid().nullable(),
  to_account_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  card_id: z.string().uuid().nullable(),
  is_bill_payment: z.boolean(),
  is_installment_payment: z.boolean(),
  is_recurring_payment: z.boolean(),
  installment_number: z.number().int().positive().nullable(),
  total_installments: z.number().int().positive().nullable(),
  parent_transaction_id: z.string().uuid().nullable(),
});

export const transactionInstallmentSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  installment_number: z.number().int().positive(),
  total_installments: z.number().int().positive(),
  due_on: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // ISO date or date string
});

export const transactionsClientPropsSchema = z.object({
  accounts: z.array(accountSchema),
  categories: z.array(categorySchema),
  cards: z.array(cardItemSchema),
  tags: z.array(tagSchema),
  transactions: z.array(transactionSchema),
  transactionInstallments: z.array(transactionInstallmentSchema),
});

// Inferred TypeScript types
export type Account = z.infer<typeof accountSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CardItem = z.infer<typeof cardItemSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionInstallment = z.infer<typeof transactionInstallmentSchema>;
export type TransactionsClientProps = z.infer<typeof transactionsClientPropsSchema>;

// Validation helper functions
export const validateAccount = (data: unknown) => accountSchema.safeParse(data);
export const validateCategory = (data: unknown) => categorySchema.safeParse(data);
export const validateCardItem = (data: unknown) => cardItemSchema.safeParse(data);
export const validateTag = (data: unknown) => tagSchema.safeParse(data);
export const validateTransaction = (data: unknown) => transactionSchema.safeParse(data);
export const validateTransactionInstallment = (data: unknown) => transactionInstallmentSchema.safeParse(data);
export const validateTransactionsClientProps = (data: unknown) => transactionsClientPropsSchema.safeParse(data);

// Array validation helpers
export const validateAccounts = (data: unknown) => z.array(accountSchema).safeParse(data);
export const validateCategories = (data: unknown) => z.array(categorySchema).safeParse(data);
export const validateCards = (data: unknown) => z.array(cardItemSchema).safeParse(data);
export const validateTags = (data: unknown) => z.array(tagSchema).safeParse(data);
export const validateTransactions = (data: unknown) => z.array(transactionSchema).safeParse(data);
export const validateTransactionInstallments = (data: unknown) => z.array(transactionInstallmentSchema).safeParse(data);
