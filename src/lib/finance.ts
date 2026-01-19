export function parseAmount(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const sanitized = trimmed.replace(/[^\d,.-]/g, '');
  if (!sanitized) return 0;
  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');
  let normalized = sanitized;

  if (hasComma && hasDot) {
    normalized = sanitized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = sanitized.replace(',', '.');
  } else if (hasDot) {
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      normalized = `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
    }
  }

  normalized = normalized.replace(/(?!^)-/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function withCurrencyPrefix(formatted: string, prefix: string) {
  const trimmedPrefix = prefix.trim();
  if (!trimmedPrefix) return formatted;
  return `${trimmedPrefix} ${formatted}`;
}

export function formatCurrencyInput(value: string, prefix: string = 'R$') {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number.parseInt(digits, 10) / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return withCurrencyPrefix(formatted, prefix);
}

export function formatCurrencyValue(value: number | string | null | undefined, prefix: string = 'R$') {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return withCurrencyPrefix(formatted, prefix);
  }

  return formatCurrencyInput(value, prefix);
}

export function parseIntValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') {
    return new Date();
  }
  return new Date(`${value}T00:00:00`);
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

const currencyPrefixMap: Record<CurrencyCode, string> = {
  BRL: 'R$',
  USD: 'US$',
  EUR: '€',
};

export function formatCurrency(amount: number | null | undefined, currency: CurrencyCode = 'BRL') {
  const normalized = Number(amount ?? 0);
  const safeAmount = Number.isFinite(normalized) ? normalized : 0;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);

  return `${currencyPrefixMap[currency]} ${formatted}`;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type StatementWindow = {
  start: Date;
  end: Date;
  closingDate: Date;
  startLabel: string;
  endLabel: string;
};

export function getStatementWindow(closingDay: number, referenceDate: Date = new Date()): StatementWindow {
  const safeClosingDay = Math.max(closingDay, 1);
  const ref = new Date(referenceDate);
  const monthClosing = new Date(ref.getFullYear(), ref.getMonth(), safeClosingDay);
  const lastClosing = ref.getDate() <= safeClosingDay ? addMonths(monthClosing, -1) : monthClosing;
  const nextClosing = addMonths(lastClosing, 1);
  const start = addDays(lastClosing, 1);

  return {
    start,
    end: nextClosing,
    closingDate: nextClosing,
    startLabel: toDateString(start),
    endLabel: toDateString(nextClosing),
  };
}

export function getStatementDueDate(closingDate: Date, dueDay: number) {
  const safeDueDay = Math.max(dueDay, 1);
  const closingDay = closingDate.getDate();
  const dueMonthOffset = safeDueDay <= closingDay ? 1 : 0;
  const dueMonth = closingDate.getMonth() + dueMonthOffset;

  return new Date(closingDate.getFullYear(), dueMonth, safeDueDay);
}

export function getMonthRange(target: Date) {
  const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1));
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0));

  return {
    start,
    end,
    startLabel: toDateString(start),
    endLabel: toDateString(end),
  };
}
