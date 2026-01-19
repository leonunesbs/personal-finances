'use server';

import { generateObject } from 'ai';
import { parse } from 'csv-parse/sync';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@/lib/supabase/auth';
import { openai } from '@ai-sdk/openai';
import {
  addMonths,
  getStatementDueDate,
  getStatementWindow,
  parseAmount,
  parseDate,
  parseIntValue,
  toDateString,
} from '@/lib/finance';

const debugLog = (payload: Record<string, unknown>) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/020c20af-9e01-4cb4-87a1-79898c378dda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
  // #endregion
};

type CsvRow = {
  date: string;
  title: string;
  amount: string;
};

type ImportRowPayload = {
  date: string;
  title: string;
  amount: number | string;
  categoryId?: string;
};

function parseCsvContent(content: string): CsvRow[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

function parseCsvDate(value: string) {
  if (!value) return null;
  const trimmed = value.trim();
  const brazilianMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
  const normalized = brazilianMatch ? `${brazilianMatch[3]}-${brazilianMatch[2]}-${brazilianMatch[1]}` : trimmed;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateString(parsed);
}

const installmentRatioRegex = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;

function extractInstallmentRatio(description: string | null) {
  if (!description) return null;
  const match = installmentRatioRegex.exec(description);
  if (!match) return null;
  const installmentNumber = Number.parseInt(match[1] ?? '', 10);
  const totalInstallments = Number.parseInt(match[2] ?? '', 10);
  if (!installmentNumber || !totalInstallments || installmentNumber > totalInstallments) {
    return null;
  }
  return { installmentNumber, totalInstallments };
}

function upsertInstallmentRatio(description: string | null, installmentNumber: number, totalInstallments: number) {
  if (!description) return description;
  if (!installmentNumber || !totalInstallments || installmentNumber > totalInstallments) {
    return description;
  }
  const ratio = `${installmentNumber}/${totalInstallments}`;
  if (installmentRatioRegex.test(description)) {
    return description.replace(installmentRatioRegex, ratio);
  }
  const trimmed = description.trim();
  return trimmed ? `${trimmed} ${ratio}` : ratio;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _suggestCategory(description: string, categories: string[]) {
  const normalizedCategories = categories.map((category) => category.trim()).filter(Boolean);
  if (normalizedCategories.length === 0) {
    return '';
  }
  const indexedList = normalizedCategories.map((category, index) => `${index} - ${category}`).join('\n');
  const maxIndex = normalizedCategories.length - 1;
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'transactions/actions.ts:suggestCategory:before',
      message: 'IA suggestCategory request',
      data: {
        description,
        categoriesCount: normalizedCategories.length,
        maxIndex,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  debugLog({
    hypothesisId: 'H6',
    location: 'transactions/actions.ts:suggestCategory',
    message: 'suggest category request',
    data: {
      description,
      categoriesCount: normalizedCategories.length,
      hasOutros: normalizedCategories.includes('Outros'),
    },
  });
  try {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      schema: z.object({
        index: z.number().int().min(0).max(maxIndex),
      }),
      messages: [
        {
          role: 'system',
          content: 'Escolha a categoria mais adequada para a descrição. Use apenas a lista fornecida.',
        },
        {
          role: 'user',
          content: `Descrição: "${description}"\nCategorias:\n${indexedList}\nResponda somente com o índice.`,
        },
      ],
    });
    debugLog({
      hypothesisId: 'H6',
      location: 'transactions/actions.ts:suggestCategory',
      message: 'suggest category response',
      data: { description, index: object.index, category: normalizedCategories[object.index] ?? null },
    });
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'transactions/actions.ts:suggestCategory:after',
        message: 'IA suggestCategory response',
        data: {
          description,
          index: object.index,
          category: normalizedCategories[object.index] ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return normalizedCategories[object.index] ?? '';
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H5',
        location: 'transactions/actions.ts:suggestCategory:error',
        message: 'IA suggestCategory error',
        data: {
          description,
          errorMessage: error instanceof Error ? error.message : 'unknown',
          errorName: error instanceof Error ? error.name : 'unknown',
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw error;
  }
}

async function suggestCategoryBatch(descriptions: string[], categories: string[]) {
  const normalizedDescriptions = descriptions.map((description) => description.trim()).filter(Boolean);
  if (normalizedDescriptions.length === 0) {
    return {} as Record<string, string>;
  }
  const normalizedCategories = categories.map((category) => category.trim()).filter(Boolean);
  if (normalizedCategories.length === 0) {
    return {} as Record<string, string>;
  }
  const indexedCategories = normalizedCategories.map((category, index) => `${index} - ${category}`).join('\n');
  const indexedDescriptions = normalizedDescriptions
    .map((description, index) => `${index} - ${description}`)
    .join('\n');
  const maxCategoryIndex = normalizedCategories.length - 1;
  const maxDescriptionIndex = normalizedDescriptions.length - 1;
  const { object } = await generateObject({
    model: openai('gpt-5-mini'),
    schema: z.object({
      suggestions: z.array(
        z.object({
          descriptionIndex: z.number().int().min(0).max(maxDescriptionIndex),
          categoryIndex: z.number().int().min(0).max(maxCategoryIndex),
        }),
      ),
    }),
    messages: [
      {
        role: 'system',
        content: 'Sugira a categoria mais adequada para cada descrição. Use somente os índices fornecidos.',
      },
      {
        role: 'user',
        content: `Descrições:\n${indexedDescriptions}\n\nCategorias:\n${indexedCategories}\n\nResponda apenas com a lista de índices no formato solicitado.`,
      },
    ],
  });
  const suggestions: Record<string, string> = {};
  for (const item of object.suggestions) {
    const description = normalizedDescriptions[item.descriptionIndex];
    const category = normalizedCategories[item.categoryIndex];
    if (description && category) {
      suggestions[description] = category;
    }
  }
  return suggestions;
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function suggestImportCategories(descriptions: string[], categories: string[]) {
  if (!descriptions?.length || !categories?.length) {
    return { suggestions: {} as Record<string, string> };
  }
  const uniqueDescriptions = Array.from(new Set(descriptions)).filter(Boolean);
  const suggestions: Record<string, string> = {};
  const normalizedCategories = categories.map((category) => category.trim()).filter(Boolean);
  if (normalizedCategories.length === 0) {
    return { suggestions };
  }
  const hasGatewayKey = Boolean(process.env.OPENAI_API_KEY);
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H7',
      location: 'transactions/actions.ts:suggestImportCategories:auth',
      message: 'AI gateway key presence',
      data: { hasGatewayKey },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!hasGatewayKey) {
    return {
      suggestions,
      error: 'IA não autenticada. Configure OPENAI_API_KEY para usar sugestões.',
    };
  }
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'transactions/actions.ts:suggestImportCategories:start',
      message: 'Suggest import categories start',
      data: {
        descriptionsCount: uniqueDescriptions.length,
        categoriesCount: normalizedCategories.length,
        hasOutros: normalizedCategories.includes('Outros'),
        sampleCategories: normalizedCategories.slice(0, 5),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  debugLog({
    hypothesisId: 'H6',
    location: 'transactions/actions.ts:suggestImportCategories',
    message: 'suggest import categories start',
    data: {
      descriptionsCount: uniqueDescriptions.length,
      categoriesCount: normalizedCategories.length,
      hasOutros: normalizedCategories.includes('Outros'),
    },
  });
  let hasAuthError = false;
  let hasQuotaError = false;
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'transactions/actions.ts:suggestImportCategories:loop-plan',
      message: 'Suggest categories loop plan',
      data: {
        uniqueDescriptionsCount: uniqueDescriptions.length,
        expectedCalls: uniqueDescriptions.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const batchSize = 25;
  for (let start = 0; start < uniqueDescriptions.length; start += batchSize) {
    const batch = uniqueDescriptions.slice(start, start + batchSize);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'transactions/actions.ts:suggestImportCategories:batch',
        message: 'Suggest categories batch',
        data: {
          batchStart: start,
          batchSize: batch.length,
          total: uniqueDescriptions.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const batchSuggestions = await suggestCategoryBatch(batch, normalizedCategories);
      Object.assign(suggestions, batchSuggestions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      const errorName = error instanceof Error ? error.name : '';
      if (errorMessage.includes('Unauthenticated request to AI Gateway')) {
        hasAuthError = true;
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H8',
            location: 'transactions/actions.ts:suggestImportCategories:auth-error',
            message: 'AI gateway unauthenticated',
            data: { batchSize: batch.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        break;
      }
      if (
        errorName === 'AI_RetryError' ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('insufficient_quota')
      ) {
        hasQuotaError = true;
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H13',
            location: 'transactions/actions.ts:suggestImportCategories:quota-error',
            message: 'AI quota exceeded',
            data: { batchSize: batch.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        break;
      }
      if (normalizedCategories.includes('Outros')) {
        for (const description of batch) {
          suggestions[description] = 'Outros';
        }
      }
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H3',
          location: 'transactions/actions.ts:suggestImportCategories:catch',
          message: 'Suggest category batch failed; fallback applied',
          data: {
            batchSize: batch.length,
            fallback: normalizedCategories.includes('Outros') ? 'Outros' : 'none',
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
  }
  if (hasAuthError) {
    return {
      suggestions: {},
      error: 'IA não autenticada. Configure OPENAI_API_KEY para usar sugestões.',
    };
  }
  if (hasQuotaError) {
    return {
      suggestions: {},
      error: 'IA indisponível no momento. Verifique sua cota da OpenAI e tente novamente.',
    };
  }
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H4',
      location: 'transactions/actions.ts:suggestImportCategories:done',
      message: 'Suggest import categories done',
      data: {
        suggestionsCount: Object.keys(suggestions).length,
        sample: Object.entries(suggestions).slice(0, 5),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  debugLog({
    hypothesisId: 'H6',
    location: 'transactions/actions.ts:suggestImportCategories',
    message: 'suggest import categories done',
    data: {
      suggestionsCount: Object.keys(suggestions).length,
      sample: Object.entries(suggestions).slice(0, 5),
    },
  });

  return { suggestions };
}

export async function importTransactions(formData: FormData) {
  const { supabase, user } = await requireUser();

  const file = formData.get('csv_file');
  const accountId = getText(formData, 'account_id');
  const cardId = getText(formData, 'card_id') || null;
  const rowsJson = getText(formData, 'rows_json');
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H2',
      location: 'transactions/actions.ts:importTransactions:start',
      message: 'Import start snapshot',
      data: {
        hasFile: file instanceof File,
        fileSize: file instanceof File ? file.size : null,
        hasRowsJson: Boolean(rowsJson),
        rowsJsonLength: rowsJson.length,
        hasAccountId: Boolean(accountId),
        hasCardId: Boolean(cardId),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!(file instanceof File) && !rowsJson) {
    return { ok: false, message: 'Selecione um arquivo CSV válido.' };
  }

  if (file instanceof File && file.size === 0) {
    return { ok: false, message: 'Selecione um arquivo CSV válido.' };
  }

  if (!accountId) {
    return { ok: false, message: 'Selecione uma conta para importar.' };
  }

  if (!cardId) {
    return { ok: false, message: 'Selecione um cartão para importar a fatura.' };
  }

  let cardAccountId: string | null = null;
  if (cardId) {
    const { data: card } = await supabase
      .from('cards')
      .select('account_id, closing_day, due_day')
      .eq('id', cardId)
      .single();
    cardAccountId = card?.account_id ?? null;
    // cardClosingDay and cardDueDay from card intentionally unused for now
    if (!cardAccountId) {
      return { ok: false, message: 'Cartão inválido ou sem conta vinculada.' };
    }
  }

  const { data: account } = await supabase.from('accounts').select('type').eq('id', accountId).single();
  if (account?.type === 'credit') {
    if (!cardId || cardAccountId !== accountId) {
      return { ok: false, message: 'Conta de crédito exige cartão válido.' };
    }
  }

  const resolvedAccountId = cardId && cardAccountId ? cardAccountId : accountId;

  let parsedRows: Array<{
    occurred_on: string;
    amount: number;
    description: string | null;
    kind: string;
    category_id: string | null;
    is_installment_payment: boolean;
  }> = [];

  if (rowsJson) {
    try {
      const rows = JSON.parse(rowsJson) as ImportRowPayload[];
      parsedRows = rows
        .map((row) => {
          const occurredOn = parseCsvDate(row.date);
          const amountValue = typeof row.amount === 'number' ? row.amount : parseAmount(row.amount);
          const description = row.title?.trim() ?? '';
          if (!occurredOn || amountValue === 0) {
            return null;
          }
          const kind = amountValue < 0 ? 'income' : 'expense';
          const normalizedCategoryId =
            typeof row.categoryId === 'string' && row.categoryId.trim() !== '' ? row.categoryId : null;
          return {
            occurred_on: occurredOn,
            amount: Math.abs(amountValue),
            description: description || null,
            kind,
            category_id: normalizedCategoryId,
            is_installment_payment: Boolean(extractInstallmentRatio(description || null)),
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'transactions/actions.ts:importTransactions:rows-json',
          message: 'Parsed rows from rows_json',
          data: {
            rowsCount: rows.length,
            parsedCount: parsedRows.length,
            sampleInputDate: rows[0]?.date ?? null,
            sampleOccurredOn: parsedRows[0]?.occurred_on ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch {
      return { ok: false, message: 'Não foi possível ler os dados da prévia.' };
    }
  } else if (file instanceof File) {
    const content = await file.text();
    let rows: CsvRow[];
    try {
      rows = parseCsvContent(content);
    } catch {
      return { ok: false, message: 'CSV inválido. Verifique as colunas date,title,amount.' };
    }

    parsedRows = rows
      .map((row) => {
        const occurredOn = parseCsvDate(row.date);
        const amountValue = parseAmount(row.amount);
        const description = row.title?.trim() ?? '';
        if (!occurredOn || amountValue === 0) {
          return null;
        }
        const kind = amountValue < 0 ? 'income' : 'expense';
        return {
          occurred_on: occurredOn,
          amount: Math.abs(amountValue),
          description: description || null,
          kind,
          category_id: null,
          is_installment_payment: Boolean(extractInstallmentRatio(description || null)),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }

  if (parsedRows.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'transactions/actions.ts:importTransactions:no-rows',
        message: 'No parsed rows after import parse',
        data: { parsedRowsLength: parsedRows.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return { ok: false, message: 'Nenhuma linha válida encontrada no CSV.' };
  }

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/698d3491-aa0e-49e5-8a5c-20be2b2c07f5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: 'H5',
      location: 'transactions/actions.ts:importTransactions:parsed-summary',
      message: 'Parsed rows summary',
      data: {
        parsedRowsCount: parsedRows.length,
        withCategoryCount: parsedRows.filter((row) => Boolean(row.category_id)).length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const otherCategoryIdCache = new Map<string, string | null>();
  const getOtherCategoryId = async (kind: string) => {
    if (otherCategoryIdCache.has(kind)) {
      return otherCategoryIdCache.get(kind) ?? null;
    }
    const categoryKind = kind === 'income' ? 'income' : 'expense';
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Outros')
      .eq('kind', categoryKind)
      .limit(1)
      .single();
    if (existing?.id) {
      otherCategoryIdCache.set(kind, existing.id);
      return existing.id;
    }
    const { data: created } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: 'Outros', kind: categoryKind })
      .select('id')
      .single();
    otherCategoryIdCache.set(kind, created?.id ?? null);
    return created?.id ?? null;
  };

  const payload = [];
  for (const row of parsedRows) {
    const fallbackCategoryId = row.category_id ? null : await getOtherCategoryId(row.kind);
    payload.push({
      user_id: user.id,
      kind: row.kind,
      description: row.description,
      amount: row.amount,
      occurred_on: row.occurred_on,
      account_id: resolvedAccountId,
      category_id: row.category_id ?? fallbackCategoryId,
      card_id: cardId,
      to_account_id: null,
      notes: null,
      is_installment_payment: row.is_installment_payment,
    });
  }

  const { error } = await supabase.from('transactions').insert(payload);
  if (error) {
    return { ok: false, message: 'Erro ao importar transações.' };
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');

  return { ok: true, imported: payload.length };
}

export async function createTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const kind = getText(formData, 'kind');
  const description = getText(formData, 'description');
  const amount = parseAmount(formData.get('amount'));
  const occurredOn = toDateString(parseDate(formData.get('occurred_on')));
  const accountId = getText(formData, 'account_id') || null;
  const toAccountId = getText(formData, 'to_account_id') || null;
  const categoryId = getText(formData, 'category_id') || null;
  const cardId = getText(formData, 'card_id') || null;
  const notes = getText(formData, 'notes') || null;
  const installmentCount = Math.max(parseIntValue(formData.get('installments')), 0);
  const firstInstallmentOn = toDateString(parseDate(formData.get('first_installment_on') || occurredOn));
  const isRecurring = getText(formData, 'is_recurring') === 'true';
  const isBillPayment = getText(formData, 'is_bill_payment') === 'true';
  const isInstallmentPayment = getText(formData, 'is_installment_payment') === 'true';
  const isRecurringPayment = getText(formData, 'is_recurring_payment') === 'true';
  const recurrenceFrequency = getText(formData, 'recurrence_frequency');
  const recurrenceInterval = Math.max(parseIntValue(formData.get('recurrence_interval')), 1);
  const recurrenceEndOn = getText(formData, 'recurrence_end_on') || null;
  const recurrenceOccurrences = parseIntValue(formData.get('recurrence_occurrences'));
  const tagIds = formData.getAll('tag_ids').filter((value): value is string => typeof value === 'string');

  debugLog({
    hypothesisId: 'H5',
    location: 'transactions/actions.ts:40',
    message: 'auth context',
    data: {
      userId: user.id,
      sessionUserId: sessionData.session?.user?.id ?? null,
      hasAccessToken: Boolean(sessionData.session?.access_token),
    },
  });

  debugLog({
    hypothesisId: 'H1',
    location: 'transactions/actions.ts:44',
    message: 'createTransaction parsed fields',
    data: {
      kind,
      amount,
      hasAccountId: Boolean(accountId),
      hasToAccountId: Boolean(toAccountId),
      hasCardId: Boolean(cardId),
      hasCategoryId: Boolean(categoryId),
      installmentCount,
      isRecurring,
      recurrenceFrequency,
      recurrenceInterval,
      hasRecurrenceEndOn: Boolean(recurrenceEndOn),
      hasRecurrenceOccurrences: Boolean(recurrenceOccurrences),
      tagCount: tagIds.length,
    },
  });

  let resolvedAccountId = accountId;
  let cardAccountId: string | null = null;

  if (cardId) {
    const { data: card } = await supabase.from('cards').select('account_id').eq('id', cardId).single();
    cardAccountId = card?.account_id ?? null;
    debugLog({
      hypothesisId: 'H2',
      location: 'transactions/actions.ts:63',
      message: 'card lookup result',
      data: { hasCardAccountId: Boolean(cardAccountId) },
    });
    if (!cardAccountId) {
      debugLog({
        hypothesisId: 'H2',
        location: 'transactions/actions.ts:69',
        message: 'returning due to missing card account',
        data: {},
      });
      return;
    }
  }

  if (accountId) {
    const { data: account } = await supabase.from('accounts').select('type').eq('id', accountId).single();
    debugLog({
      hypothesisId: 'H3',
      location: 'transactions/actions.ts:78',
      message: 'account lookup result',
      data: { accountType: account?.type ?? 'unknown' },
    });
    if (account?.type === 'credit') {
      if (!cardId || cardAccountId !== accountId) {
        debugLog({
          hypothesisId: 'H3',
          location: 'transactions/actions.ts:85',
          message: 'returning due to credit account mismatch',
          data: { hasCardId: Boolean(cardId), cardMatchesAccount: cardAccountId === accountId },
        });
        return;
      }
    }
  }

  if (cardId && kind !== 'transfer') {
    resolvedAccountId = cardAccountId;
  }

  if (!kind || amount <= 0 || !resolvedAccountId) {
    debugLog({
      hypothesisId: 'H1',
      location: 'transactions/actions.ts:99',
      message: 'returning due to missing required fields',
      data: { hasKind: Boolean(kind), amount, hasResolvedAccountId: Boolean(resolvedAccountId) },
    });
    return;
  }

  if (kind === 'transfer' && !toAccountId) {
    debugLog({
      hypothesisId: 'H1',
      location: 'transactions/actions.ts:108',
      message: 'returning due to missing transfer account',
      data: { hasToAccountId: Boolean(toAccountId) },
    });
    return;
  }

  // Create transactions (single or multiple for installments)
  const transactions = [];

  if (installmentCount > 1) {
    // Create multiple transaction records for installments
    for (let i = 0; i < installmentCount; i++) {
      const installmentDate = addMonths(new Date(`${firstInstallmentOn}T00:00:00`), i);
      const installmentDescription = upsertInstallmentRatio(description, i + 1, installmentCount);

      transactions.push({
        user_id: user.id,
        kind,
        description: installmentDescription,
        amount,
        occurred_on: toDateString(installmentDate),
        account_id: resolvedAccountId,
        to_account_id: kind === 'transfer' ? toAccountId : null,
        category_id: categoryId,
        card_id: cardId,
        notes,
        is_bill_payment: kind === 'transfer' ? isBillPayment : false,
        is_installment_payment: true,
        is_recurring_payment: isRecurringPayment,
        installment_number: i + 1,
        total_installments: installmentCount,
        parent_transaction_id: null, // Will be set for subsequent installments
      });
    }
  } else {
    // Single transaction
    transactions.push({
      user_id: user.id,
      kind,
      description,
      amount,
      occurred_on: occurredOn,
      account_id: resolvedAccountId,
      to_account_id: kind === 'transfer' ? toAccountId : null,
      category_id: categoryId,
      card_id: cardId,
      notes,
      is_bill_payment: kind === 'transfer' ? isBillPayment : false,
      is_installment_payment: isInstallmentPayment,
      is_recurring_payment: isRecurringPayment,
      installment_number: null,
      total_installments: null,
      parent_transaction_id: null,
    });
  }

  const { data: insertedTransactions, error: transactionError } = await supabase
    .from('transactions')
    .insert(transactions)
    .select('id');

  debugLog({
    hypothesisId: 'H4',
    location: 'transactions/actions.ts:129',
    message: 'transaction insert result',
    data: {
      hasTransactions: Boolean(insertedTransactions?.length),
      transactionCount: insertedTransactions?.length ?? 0,
      hasError: Boolean(transactionError),
      errorCode: transactionError?.code ?? null,
      errorMessage: transactionError?.message ?? null,
      errorHint: transactionError?.hint ?? null,
      errorDetails: transactionError?.details ?? null,
      kind,
      accountId: resolvedAccountId,
      toAccountId: kind === 'transfer' ? toAccountId : null,
      cardId,
      categoryId,
      installmentCount,
    },
  });

  // Set parent_transaction_id for installments after first one
  if (installmentCount > 1 && insertedTransactions && insertedTransactions.length > 0) {
    const parentId = insertedTransactions[0]?.id;
    if (parentId && insertedTransactions.length > 1) {
      const childIds = insertedTransactions.slice(1).map((t) => t.id);
      await supabase.from('transactions').update({ parent_transaction_id: parentId }).in('id', childIds);
    }
  }

  // Add tags to first transaction (or only transaction)
  if (insertedTransactions && insertedTransactions.length > 0 && tagIds.length > 0) {
    const firstTransactionId = insertedTransactions[0]?.id;
    if (firstTransactionId) {
      await supabase
        .from('transaction_tags')
        .insert(tagIds.map((tagId) => ({ transaction_id: firstTransactionId, tag_id: tagId })));
    }
  }

  if (isRecurring) {
    await supabase.from('recurring_rules').insert({
      user_id: user.id,
      kind,
      description,
      amount,
      account_id: accountId,
      to_account_id: kind === 'transfer' ? toAccountId : null,
      category_id: categoryId,
      card_id: cardId,
      start_on: occurredOn,
      end_on: recurrenceEndOn,
      frequency: recurrenceFrequency || 'monthly',
      interval: recurrenceInterval,
      occurrences: recurrenceOccurrences || null,
      next_run_on: occurredOn,
    });
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');
}

export async function updateTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const transactionId = getText(formData, 'id');
  const kind = getText(formData, 'kind');
  const description = getText(formData, 'description') || null;
  const amount = parseAmount(formData.get('amount'));
  const occurredOn = toDateString(parseDate(formData.get('occurred_on')));
  const accountId = getText(formData, 'account_id') || null;
  const toAccountId = getText(formData, 'to_account_id') || null;
  const categoryId = getText(formData, 'category_id') || null;
  const cardId = getText(formData, 'card_id') || null;
  const isBillPayment = getText(formData, 'is_bill_payment') === 'true';
  const isInstallmentPayment = getText(formData, 'is_installment_payment') === 'true';
  const isRecurringPayment = getText(formData, 'is_recurring_payment') === 'true';
  const installmentNumber = parseIntValue(formData.get('installment_number'));
  const totalInstallments = parseIntValue(formData.get('total_installments'));
  const createFutureInstallments = getText(formData, 'create_future_installments') === 'true';
  const normalizedDescription = isInstallmentPayment
    ? upsertInstallmentRatio(description, installmentNumber, totalInstallments)
    : description;

  if (!transactionId) {
    return { ok: false, message: 'Transação inválida.' };
  }

  if (!kind || amount <= 0 || !accountId) {
    return { ok: false, message: 'Preencha tipo, conta e valor.' };
  }

  if (kind === 'transfer' && !toAccountId) {
    return { ok: false, message: 'Selecione a conta destino.' };
  }

  let cardAccountId: string | null = null;
  let cardClosingDay: number | null = null;
  let cardDueDay: number | null = null;
  if (cardId) {
    const { data: card } = await supabase
      .from('cards')
      .select('account_id, closing_day, due_day')
      .eq('id', cardId)
      .single();
    cardAccountId = card?.account_id ?? null;
    cardClosingDay = card?.closing_day ?? null;
    cardDueDay = card?.due_day ?? null;
    if (!cardAccountId) {
      return { ok: false, message: 'Cartão inválido ou sem conta vinculada.' };
    }
  }

  if (accountId) {
    const { data: account } = await supabase.from('accounts').select('type').eq('id', accountId).single();
    if (account?.type === 'credit') {
      if (!cardId || cardAccountId !== accountId) {
        return { ok: false, message: 'Conta de crédito exige cartão válido.' };
      }
    }
  }

  const { error } = await supabase
    .from('transactions')
    .update({
      kind,
      description: normalizedDescription,
      amount,
      occurred_on: occurredOn,
      account_id: accountId,
      to_account_id: kind === 'transfer' ? toAccountId : null,
      category_id: categoryId,
      card_id: cardId,
      is_bill_payment: kind === 'transfer' ? isBillPayment : false,
      is_installment_payment: isInstallmentPayment,
      is_recurring_payment: isRecurringPayment,
    })
    .eq('id', transactionId)
    .eq('user_id', user.id);

  if (error) {
    return { ok: false, message: 'Erro ao atualizar a transação.' };
  }

  // Create future installment transactions if requested
  if (
    createFutureInstallments &&
    isInstallmentPayment &&
    installmentNumber > 0 &&
    totalInstallments > installmentNumber &&
    accountId
  ) {
    const baseDate = new Date(`${occurredOn}T00:00:00`);
    const futureInstallments = [];

    for (let i = installmentNumber + 1; i <= totalInstallments; i++) {
      const installmentDate = addMonths(baseDate, i - installmentNumber);
      const futureOccurredOn =
        cardClosingDay && cardDueDay
          ? toDateString(
              getStatementDueDate(getStatementWindow(cardClosingDay, installmentDate).closingDate, cardDueDay),
            )
          : toDateString(installmentDate);

      futureInstallments.push({
        user_id: user.id,
        kind,
        description: upsertInstallmentRatio(normalizedDescription, i, totalInstallments),
        amount,
        occurred_on: futureOccurredOn,
        account_id: accountId,
        to_account_id: kind === 'transfer' ? null : null,
        category_id: categoryId,
        card_id: cardId,
        notes: null,
        is_installment_payment: true,
        is_recurring_payment: false,
        installment_number: i,
        total_installments: totalInstallments,
        parent_transaction_id: transactionId,
      });
    }

    if (futureInstallments.length > 0) {
      await supabase.from('transactions').insert(futureInstallments);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');

  return { ok: true };
}

const deleteTransactionsSchema = z.array(z.string().min(1)).min(1);

export async function deleteTransactions(
  transactionIds: string[],
  options?: {
    deleteFuture?: boolean;
  },
) {
  const parsed = deleteTransactionsSchema.safeParse(transactionIds);
  if (!parsed.success) {
    return { ok: false, message: 'Selecione ao menos uma transação.' };
  }

  const { supabase, user } = await requireUser();

  // If deleteFuture is true, also delete related future installments
  if (options?.deleteFuture) {
    const { data: relatedTransactions } = await supabase
      .from('transactions')
      .select('id')
      .in('parent_transaction_id', parsed.data)
      .eq('user_id', user.id);

    if (relatedTransactions && relatedTransactions.length > 0) {
      const allIds = [...parsed.data, ...relatedTransactions.map((t) => t.id)];
      const { error } = await supabase.from('transactions').delete().in('id', allIds).eq('user_id', user.id);

      if (error) {
        return { ok: false, message: 'Não foi possível excluir as transações selecionadas.' };
      }
    } else {
      const { error } = await supabase.from('transactions').delete().in('id', parsed.data).eq('user_id', user.id);

      if (error) {
        return { ok: false, message: 'Não foi possível excluir as transações selecionadas.' };
      }
    }
  } else {
    const { error } = await supabase.from('transactions').delete().in('id', parsed.data).eq('user_id', user.id);

    if (error) {
      return { ok: false, message: 'Não foi possível excluir as transações selecionadas.' };
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/budgets');

  return { ok: true };
}
