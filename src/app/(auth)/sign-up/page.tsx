import Link from "next/link";

import { sendMagicLink } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignUpPageProps = {
  searchParams?: {
    error?: string;
    sent?: string;
  };
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Receba um magic link para criar sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action={sendMagicLink}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          {resolvedParams.sent ? <p className="text-sm">Confira seu e-mail para finalizar.</p> : null}
          {resolvedParams.error ? <p className="text-sm">{resolvedParams.error}</p> : null}
          <Button type="submit" className="w-full">
            Enviar link
          </Button>
        </form>
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
