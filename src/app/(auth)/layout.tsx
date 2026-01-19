import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">{children}</div>;
}
