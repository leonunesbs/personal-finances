import { z } from 'zod';

// Zod schema for import row
export const importRowSchema = z.object({
  id: z.number().int().nonnegative(),
  date: z.string().min(1),
  title: z.string().min(1),
  amount: z.number(),
  categoryId: z.string().uuid().optional(),
});

// Inferred TypeScript type
export type ImportRow = z.infer<typeof importRowSchema>;

// Validation helper
export const validateImportRow = (data: unknown) => importRowSchema.safeParse(data);
export const validateImportRows = (data: unknown) => z.array(importRowSchema).safeParse(data);
