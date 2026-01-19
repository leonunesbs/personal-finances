import Link from 'next/link';

import { MagicLinkForm } from '@/app/(auth)/magic-link-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type SignUpPageProps = {
  searchParams?: {
    error?: string;
    sent?: string;
  };
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const sentMessage = resolvedParams.sent ? 'Confira seu e-mail para finalizar.' : undefined;
  const errorMessage = resolvedParams.error ? resolvedParams.error : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Receba um magic link para criar sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <MagicLinkForm submitLabel="Enviar link" successMessage={sentMessage} errorMessage={errorMessage} />
      </CardContent>
      <CardFooter className="justify-between">
        <p className="text-sm">Já possui conta?</p>
        <Button asChild variant="ghost">
          <Link href="/sign-in">Entrar</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
