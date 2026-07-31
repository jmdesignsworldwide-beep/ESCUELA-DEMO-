import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { WhatsappView } from "./whatsapp-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { COLEGIO } from "@/lib/constants";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import {
  getPlantillasWhatsapp,
  getDestinatariosWhatsapp,
  getEnviosWhatsappRecientes,
} from "@/lib/whatsapp/queries";

export const metadata: Metadata = { title: "WhatsApp" };
export const dynamic = "force-dynamic";

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: { seccion?: string; morosos?: string };
}) {
  await requireRole(["director", "coordinador", "secretaria", "contabilidad"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="WhatsApp" description="Comunicación por WhatsApp." />
        <EstructuraVacia />
      </div>
    );
  }

  const seccionSel = searchParams.seccion && searchParams.seccion !== "todas"
    ? searchParams.seccion
    : null;
  const soloMorosos = searchParams.morosos === "1";

  const [niveles, grados, secciones, plantillas, destinatarios, envios] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getPlantillasWhatsapp(sede.id),
      getDestinatariosWhatsapp(seccionSel, soloMorosos),
      getEnviosWhatsappRecientes(25),
    ]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Comunicación por WhatsApp"
        description={`${sede.nombre} · Mensajería directa a las familias`}
      />
      <WhatsappView
        colegio={COLEGIO.nombre}
        secciones={secciones.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        seccionSel={searchParams.seccion ?? "todas"}
        soloMorosos={soloMorosos}
        plantillas={plantillas}
        destinatarios={destinatarios}
        envios={envios}
      />
    </div>
  );
}
