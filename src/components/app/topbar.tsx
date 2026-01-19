import { SignOutButton } from '@/components/auth/sign-out-button';

export function Topbar() {
  return (
    <header className="flex items-center justify-between p-6">
      <div className="space-y-1">
        <p className="text-sm">Visão geral</p>
        <h2 className="text-lg font-semibold">Seu painel financeiro</h2>
      </div>
      <SignOutButton />
    </header>
  );
}
