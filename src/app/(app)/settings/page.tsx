import { requireUser } from "@/lib/supabase/auth";

import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase } = await requireUser();

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

  return (
    <SettingsClient
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      cards={cards.data ?? []}
      tags={tags.data ?? []}
      transactions={transactions.data ?? []}
    />
  );
}
