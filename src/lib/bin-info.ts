import { cache } from 'react';

export type BinInfo = {
  cardType: string | null;
  issuer: string | null;
  country: string | null;
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

const extractValue = (lines: string[], label: string) => {
  const normalizedLabel = normalizeText(label);
  const index = lines.findIndex((line) => normalizeText(line) === normalizedLabel);
  if (index === -1) return null;
  return lines.slice(index + 1).find(Boolean) ?? null;
};

export const getBinInfo = cache(async (first6: string): Promise<BinInfo | null> => {
  const trimmed = first6.trim();
  if (!/^\d{6}$/.test(trimmed)) return null;

  try {
    const response = await fetch(`https://pulse.pst.net/pt/bin/${trimmed}`, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const sanitized = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n');
    const lines = sanitized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const cardType = extractValue(lines, 'Tipo de cartão');
    const issuer = extractValue(lines, 'Emissor / Nome do Banco');
    const country = extractValue(lines, 'Nome do país');

    if (!cardType && !issuer && !country) return null;

    return {
      cardType,
      issuer,
      country,
    };
  } catch {
    return null;
  }
});
