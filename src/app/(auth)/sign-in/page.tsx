import Link from "next/link";

import { sendMagicLink } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignInPageProps = {
  searchParams?: {
    error?: string;
    sent?: string;
  };
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Envie um magic link para acessar sem senha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action={sendMagicLink}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          {resolvedParams.sent ? <p className="text-sm">Confira seu e-mail para o link de acesso.</p> : null}
          {resolvedParams.error ? <p className="text-sm">{resolvedParams.error}</p> : null}
          <Button type="submit" className="w-full">
            Enviar link
          </Button>
        </form>
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
