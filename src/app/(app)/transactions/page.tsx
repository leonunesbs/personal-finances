import { requireUser } from "@/lib/supabase/auth";

import { TransactionsClient } from "./transactions-client";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { supabase } = await requireUser();

  const [accounts, categories, cards, tags, transactions] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("cards").select("*").order("created_at"),
    supabase.from("tags").select("*").order("created_at"),
    supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).limit(50),
  ]);

  return (
    <TransactionsClient
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      cards={cards.data ?? []}
      tags={tags.data ?? []}
      transactions={transactions.data ?? []}
    />
  );
}
