import { getBinInfo } from "@/lib/bin-info";
import { requireUser } from "@/lib/supabase/auth";

import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const [accounts, categories, cards, tags, transactions] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("cards").select("*").order("created_at"),
    supabase.from("tags").select("*").order("created_at"),
    supabase
      .from("transactions")
      .select("id, card_id, amount, kind, occurred_on, account_id, to_account_id")
      .order("occurred_on", {
      ascending: false,
    }),
  ]);

  const cardRows = cards.data ?? [];
  const cardsNeedingBin = cardRows.filter(
    (card) => card.first6 && !card.bin_card_type && !card.bin_issuer && !card.bin_country
  );
  const missingBins = Array.from(
    new Set(cardsNeedingBin.map((card) => card.first6).filter((value): value is string => Boolean(value)))
  );
  const binInfoEntries =
    missingBins.length > 0
      ? await Promise.all(missingBins.map(async (bin) => [bin, await getBinInfo(bin)] as const))
      : [];
  const binInfoByFirst6 = new Map(binInfoEntries);

  if (binInfoEntries.length > 0) {
    await Promise.all(
      binInfoEntries.map(async ([bin, info]) => {
        if (!info) return;
        await supabase
          .from("cards")
          .update({
            bin_card_type: info.cardType,
            bin_issuer: info.issuer,
            bin_country: info.country,
          })
          .eq("user_id", user.id)
          .eq("first6", bin);
      })
    );
  }

  const cardsWithBin = cardRows.map((card) => ({
    ...card,
    binInfo: (() => {
      const fromDb = card.bin_card_type || card.bin_issuer || card.bin_country;
      if (fromDb) {
        return {
          cardType: card.bin_card_type ?? null,
          issuer: card.bin_issuer ?? null,
          country: card.bin_country ?? null,
        };
      }
      const fetched = card.first6 ? binInfoByFirst6.get(card.first6) : null;
      return fetched ?? null;
    })(),
  }));

  return (
    <SettingsClient
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      cards={cardsWithBin}
      tags={tags.data ?? []}
      transactions={transactions.data ?? []}
    />
  );
}
