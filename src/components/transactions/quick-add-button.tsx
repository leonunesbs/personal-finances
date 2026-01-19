import { requireUser } from '@/lib/supabase/auth';
import { QuickAddSheet } from './quick-add-sheet';

export async function QuickAddButton() {
  const { supabase } = await requireUser();

  const [accounts, categories, cards, tags] = await Promise.all([
    supabase.from('accounts').select('*').order('created_at'),
    supabase.from('categories').select('*').order('created_at'),
    supabase.from('cards').select('*').order('created_at'),
    supabase.from('tags').select('*').order('created_at'),
  ]);

  return (
    <QuickAddSheet
      accounts={accounts.data ?? []}
      categories={categories.data ?? []}
      cards={cards.data ?? []}
      tags={tags.data ?? []}
    />
  );
}
