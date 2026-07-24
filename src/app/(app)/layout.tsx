import type { ReactNode } from "react";
import { requireActiveUser } from "@/lib/auth/require";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Puerta de servidor: sesión válida y cuenta activa. Redirige a /login si no.
  const { profile } = await requireActiveUser();

  return <AppShell profile={profile}>{children}</AppShell>;
}
