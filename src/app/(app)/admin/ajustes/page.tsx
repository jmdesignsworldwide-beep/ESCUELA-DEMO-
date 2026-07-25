import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { AjustesView } from "./ajustes-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import {
  getConfigInstitucional,
  getBitacora,
  getBitacoraAcciones,
} from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Ajustes y bitácora" };
export const dynamic = "force-dynamic";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: { accion?: string; entidad?: string; desde?: string };
}) {
  await requireRole(["director"]);

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Ajustes y bitácora" description="Configuración." />
        <EstructuraVacia />
      </div>
    );
  }

  const [config, bitacora, acciones] = await Promise.all([
    getConfigInstitucional(sede.id),
    getBitacora({
      accion: searchParams.accion || undefined,
      entidad: searchParams.entidad || undefined,
      desde: searchParams.desde || undefined,
    }),
    getBitacoraAcciones(),
  ]);

  return (
    <div>
      <PageHeader
        title="Ajustes y bitácora"
        description={`${sede.nombre} · Identidad institucional y auditoría`}
      />
      <AjustesView
        config={config}
        bitacora={bitacora}
        acciones={acciones}
        filtroActual={{
          accion: searchParams.accion ?? "",
          entidad: searchParams.entidad ?? "",
        }}
      />
    </div>
  );
}
