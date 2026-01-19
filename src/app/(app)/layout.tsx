import { AppShell } from "@/components/app/app-shell";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/supabase/auth";

type AppLayoutProps = {
  children: ReactNode;
};


export default async function AppLayout({ children }: AppLayoutProps) {
  const { user } = await requireUser();
  const nameFromMetadata =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
  const nameFromEmail = user.email ? user.email.split("@")[0] : undefined;
  const name: string = nameFromMetadata ?? nameFromEmail ?? "Usuário";
  const avatar = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  const email: string = user.email ?? "usuario@local";

  return <AppShell user={{ name, email, avatar }}>{children}</AppShell>;
}
