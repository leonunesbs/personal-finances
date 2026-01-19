'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TransactionCreateForm } from '@/app/(app)/transactions/components/create-form/transaction-create-form';

import type { Account, Category, CardItem, Tag } from '@/app/(app)/transactions/types';

type QuickAddSheetProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  tags: Tag[];
};

export function QuickAddSheet({ accounts, categories, cards, tags }: QuickAddSheetProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova transação
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Adicionar transação</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <TransactionCreateForm
            accounts={accounts}
            categories={categories}
            cards={cards}
            tags={tags}
            onSuccess={handleSuccess}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
