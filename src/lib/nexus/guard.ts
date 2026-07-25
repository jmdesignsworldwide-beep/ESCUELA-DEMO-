import "server-only";

import { redirect } from "next/navigation";
import { requireActiveUser, type AuthContext } from "@/lib/auth/require";
import { getMiAccesoDemo, esSuperAdmin } from "@/lib/nexus/queries";

/**
 * Barrera de vigencia demo (JM Nexus). Se ejecuta EN SERVIDOR en cada carga
 * de las áreas protegidas. Si la cuenta demo del usuario está vencida o
 * revocada, redirige a la pantalla de expiración. Las cuentas que no son
 * demo (staff interno, super-admin) pasan sin restricción.
 */
export async function gateAccesoDemo(): Promise<void> {
  const acceso = await getMiAccesoDemo();
  if (acceso?.bloqueado) {
    redirect("/acceso-expirado");
  }
}

/**
 * Exige que el usuario sea super-admin de JM Nexus. Para cualquier rol del
 * colegio (o sesión no super-admin) redirige al panel, dejando el área Nexus
 * invisible e inaccesible. La validación es 100 % de servidor.
 */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await requireActiveUser();
  if (!(await esSuperAdmin())) {
    redirect("/dashboard");
  }
  return ctx;
}
