'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/sign-in');
    router.refresh();
  };

  return (
    <Button type="button" variant="secondary" onClick={handleSignOut}>
      Sair
    </Button>
  );
}
