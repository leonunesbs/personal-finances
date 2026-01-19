import { format, isValid, parseISO } from 'date-fns';

export const normalizeImportDescription = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const parsePositiveInt = (value?: string) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const installmentRatioRegex = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;

export const parseInstallmentRatio = (description?: string | null) => {
  if (!description) return null;
  const match = installmentRatioRegex.exec(description);
  if (!match) return null;
  const installmentNumber = Number.parseInt(match[1] ?? '', 10);
  const totalInstallments = Number.parseInt(match[2] ?? '', 10);
  if (!installmentNumber || !totalInstallments || installmentNumber > totalInstallments) {
    return null;
  }
  return { installmentNumber, totalInstallments };
};

export const parseRowsJson = (value: string) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const formatShortDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : value;
};
