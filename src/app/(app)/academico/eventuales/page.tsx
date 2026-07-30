import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { EventualesView } from "./eventuales-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import { getSedeActiva, getAsignaturas } from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import { getEvaluacionesRecientes } from "@/lib/eventuales/queries";

export const metadata: Metadata = { title: "Evaluaciones eventuales" };
export const dynamic = "force-dynamic";

export default async function EventualesPage() {
  await requireRole(["director", "coordinador", "docente"]);

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader
          title="Evaluaciones eventuales"
          description="Notas y observaciones ocasionales."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [estudiantes, asignaturas, recientes] = await Promise.all([
    getEstudiantes(sede.id),
    getAsignaturas(sede.id),
    getEvaluacionesRecientes(40),
  ]);

  return (
    <div>
      <PageHeader
        title="Evaluaciones eventuales"
        description={`${sede.nombre} · Notas y observaciones fuera del libro formal`}
      />
      <EventualesView
        estudiantes={estudiantes
          .filter((e) => e.estado === "activo")
          .map((e) => ({ id: e.id, nombre: `${e.apellidos}, ${e.nombres}` }))}
        asignaturas={asignaturas.map((a) => ({ id: a.id, nombre: a.nombre }))}
        recientes={recientes}
      />
    </div>
  );
}
