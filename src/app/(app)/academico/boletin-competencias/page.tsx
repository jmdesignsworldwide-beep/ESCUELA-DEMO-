import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import { BoletinCompetenciasView } from "./boletin-competencias-view";
import {
  getSedeActiva,
  getAnioActivo,
  getPeriodos,
} from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Boletín por competencias" };
export const dynamic = "force-dynamic";

export default async function BoletinCompetenciasGenPage() {
  await requireRole(["director", "coordinador", "secretaria", "docente"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Boletín por competencias"
          description="Informe de evaluación por competencias."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [estudiantes, periodos] = await Promise.all([
    getEstudiantes(sede.id),
    getPeriodos(anio.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Boletín por competencias"
        description={`${sede.nombre} · Informe de evaluación por competencias (Ord. 04-2023)`}
      />
      <BoletinCompetenciasView
        estudiantes={estudiantes
          .filter((e) => e.estado === "activo")
          .map((e) => ({
            id: e.id,
            nombre: `${e.apellidos}, ${e.nombres}`,
          }))}
        periodos={periodos.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </div>
  );
}
