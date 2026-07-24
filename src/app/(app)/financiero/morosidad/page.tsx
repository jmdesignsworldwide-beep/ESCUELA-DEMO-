import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { MorosidadView } from "./morosidad-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getConfig } from "@/lib/finance/queries";
import { getPanelMorosidad, getProyeccion } from "@/lib/collections/queries";

export const metadata: Metadata = { title: "Morosidad y cobranza" };

export default async function MorosidadPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const { profile } = await requireRole([
    "director",
    "contabilidad",
    "coordinador",
  ]);
  const canWrite = profile.role === "director" || profile.role === "contabilidad";

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Morosidad y cobranza" description="Antigüedad y mora." />
        <EstructuraVacia />
      </div>
    );
  }

  const mes = Number(searchParams.mes ?? 8);
  const [config, panel, proyeccion] = await Promise.all([
    getConfig(sede.id),
    getPanelMorosidad(),
    getProyeccion(Number.isFinite(mes) ? mes : 8),
  ]);

  return (
    <div>
      <PageHeader
        title="Morosidad y cobranza"
        description={`${sede.nombre} · Antigüedad de saldo y proyección`}
      />
      <MorosidadView
        canWrite={canWrite}
        panel={panel}
        proyeccion={proyeccion}
        mes={Number.isFinite(mes) ? mes : 8}
        bloqueoActivo={config?.bloqueo_por_morosidad ?? false}
        diasGracia={config?.dias_gracia ?? 15}
      />
    </div>
  );
}
