import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { DisciplinaView } from "./disciplina-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import { getIncidencias } from "@/lib/discipline/queries";

export const metadata: Metadata = { title: "Disciplina" };

export default async function DisciplinaPage() {
  const { profile } = await requireRole(["director", "coordinador", "docente"]);
  const canWrite =
    profile.role === "director" ||
    profile.role === "coordinador" ||
    profile.role === "docente";

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Disciplina" description="Méritos y deméritos." />
        <EstructuraVacia />
      </div>
    );
  }

  const [incidencias, estudiantes] = await Promise.all([
    getIncidencias(sede.id),
    getEstudiantes(sede.id),
  ]);

  const opciones = estudiantes.map((e) => ({
    id: e.id,
    nombre: `${e.apellidos}, ${e.nombres}`,
  }));
  const nombres = Object.fromEntries(
    estudiantes.map((e) => [e.id, `${e.nombres} ${e.apellidos}`]),
  );

  return (
    <div>
      <PageHeader
        title="Disciplina y conducta"
        description={`${sede.nombre} · Méritos, deméritos y seguimiento`}
      />
      <DisciplinaView
        canWrite={canWrite}
        incidencias={incidencias}
        estudiantes={opciones}
        nombres={nombres}
      />
    </div>
  );
}
