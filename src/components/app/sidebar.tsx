import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transações' },
  { href: '/budgets', label: 'Orçamentos' },
  { href: '/settings', label: 'Configurações' },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col gap-6 p-6">
      <div className="space-y-1">
        <p className="text-sm">Personal Finances</p>
        <h1 className="text-xl font-semibold">Planejamento</h1>
      </div>
      <Separator />
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Button key={item.href} asChild variant="ghost">
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
