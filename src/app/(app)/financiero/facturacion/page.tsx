import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { FacturacionView } from "./facturacion-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import {
  getConfig,
  getConceptos,
  getBecas,
  getEstadoCuentaFamilias,
  getCargosFamilia,
} from "@/lib/finance/queries";

export const metadata: Metadata = { title: "Facturación" };

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: { familia?: string };
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
        <PageHeader title="Facturación" description="Conceptos, becas y cargos." />
        <EstructuraVacia />
      </div>
    );
  }

  const [config, conceptos, becas, familias, estudiantes] = await Promise.all([
    getConfig(sede.id),
    getConceptos(sede.id),
    getBecas(),
    getEstadoCuentaFamilias(),
    getEstudiantes(sede.id),
  ]);

  const nombreEst = new Map(
    estudiantes.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`]),
  );

  const familiaSel = searchParams.familia ?? "";
  const cargosFamilia = familiaSel ? await getCargosFamilia(familiaSel) : [];

  return (
    <div>
      <PageHeader
        title="Facturación"
        description={`${sede.nombre} · Conceptos, becas y estado de cuenta`}
      />
      <FacturacionView
        canWrite={canWrite}
        config={config}
        conceptos={conceptos}
        becas={becas.map((b) => ({
          ...b,
          estudiante: nombreEst.get(b.estudiante_id) ?? "—",
        }))}
        familias={familias}
        familiaSel={familiaSel}
        cargosFamilia={cargosFamilia.map((c) => ({
          ...c,
          estudiante: nombreEst.get(c.estudiante_id) ?? "—",
        }))}
        estudiantes={estudiantes
          .filter((e) => e.estado === "activo")
          .map((e) => ({ id: e.id, nombre: `${e.apellidos}, ${e.nombres}` }))}
      />
    </div>
  );
}
