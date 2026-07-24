import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/auth/require";
import { DashboardContent } from "./dashboard-content";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ROLE_SHORT } from "@/lib/types";
import { COLEGIO } from "@/lib/constants";

export const metadata: Metadata = { title: "Panel" };

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const { profile } = await requireActiveUser();
  const primerNombre = profile.nombre_completo.split(/\s+/)[0] ?? "";

  return (
    <div>
      <PageHeader
        title={`${saludo()}, ${primerNombre}`}
        description={`${COLEGIO.nombre} · Accesos de tu rol`}
        actions={<Badge variant="gold">{ROLE_SHORT[profile.role]}</Badge>}
      />
      <DashboardContent role={profile.role} />
    </div>
  );
}
