import type { ReactNode } from "react";
import { requireActiveUser } from "@/lib/auth/require";
import { gateAccesoDemo } from "@/lib/nexus/guard";
import { esSuperAdmin } from "@/lib/nexus/queries";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Puerta de servidor: sesión válida y cuenta activa. Redirige a /login si no.
  const { profile } = await requireActiveUser();
  // Capa JM Nexus: vigencia del acceso demo validada en servidor.
  await gateAccesoDemo();
  const superAdmin = await esSuperAdmin();

  return (
    <AppShell profile={profile} superAdmin={superAdmin}>
      {children}
    </AppShell>
  );
}
