import Link from "next/link";

import { MagicLinkForm } from "@/app/(auth)/magic-link-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type SignInPageProps = {
  searchParams?: {
    error?: string;
    sent?: string;
  };
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const sentMessage = resolvedParams.sent ? "Confira seu e-mail para o link de acesso." : undefined;
  const errorMessage = resolvedParams.error ? resolvedParams.error : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Envie um magic link para acessar sem senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <MagicLinkForm
          submitLabel="Enviar link"
          successMessage={sentMessage}
          errorMessage={errorMessage}
        />
      </CardContent>
      <CardFooter className="justify-between">
        <p className="text-sm">Novo por aqui?</p>
        <Button asChild variant="ghost">
          <Link href="/sign-up">Criar conta</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
