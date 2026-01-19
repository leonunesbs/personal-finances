import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { QuickAddButton } from '@/components/transactions/quick-add-button';

import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {user.email && <span className="text-sm text-muted-foreground">{user.email}</span>}
            </div>
            <QuickAddButton />
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-2 py-4 sm:px-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
