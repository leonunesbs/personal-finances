'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import { sendMagicLink } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const magicLinkSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
});

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;

type MagicLinkFormProps = {
  submitLabel: string;
  successMessage?: string;
  errorMessage?: string;
};

export function MagicLinkForm({ submitLabel, successMessage, errorMessage }: MagicLinkFormProps) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set('email', values.email);
    startTransition(async () => {
      await sendMagicLink(formData);
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>
      {successMessage ? <p className="text-sm">{successMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Enviando...' : submitLabel}
      </Button>
    </form>
  );
}
