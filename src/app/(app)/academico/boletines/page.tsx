import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { BoletinesGenerador } from "./boletines-generador";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getPeriodos,
} from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import { getDocumentosRecientes } from "@/lib/docs/queries";
import { TIPO_DOC_LABELS } from "@/lib/docs/types";

export const metadata: Metadata = { title: "Boletines y documentos" };

export default async function BoletinesPage() {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="Boletines y documentos" description="Documentos oficiales." />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, periodos, estudiantes, recientes] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getPeriodos(anio.id),
      getEstudiantes(sede.id),
      getDocumentosRecientes(15),
    ]);

  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };

  const estudianteById = new Map(
    estudiantes.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`]),
  );

  const seccionesOrden = [...secciones].sort((a, b) => {
    const na = nivelPorId.get(gradoPorId.get(a.grado_id)?.nivel_id ?? "")?.orden ?? 0;
    const nb = nivelPorId.get(gradoPorId.get(b.grado_id)?.nivel_id ?? "")?.orden ?? 0;
    return na - nb;
  });

  return (
    <div>
      <PageHeader
        title="Boletines y documentos"
        description={`${sede.nombre} · Emisión con folio verificable`}
      />
      <BoletinesGenerador
        estudiantes={estudiantes
          .filter((e) => e.estado === "activo")
          .map((e) => ({
            id: e.id,
            nombre: `${e.apellidos}, ${e.nombres}`,
          }))}
        secciones={seccionesOrden.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        periodos={periodos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        recientes={recientes.map((d) => ({
          folio: d.folio,
          tipo: TIPO_DOC_LABELS[d.tipo],
          estudiante: d.estudiante_id
            ? (estudianteById.get(d.estudiante_id) ?? "—")
            : "—",
          fecha: d.created_at,
        }))}
      />
    </div>
  );
}
