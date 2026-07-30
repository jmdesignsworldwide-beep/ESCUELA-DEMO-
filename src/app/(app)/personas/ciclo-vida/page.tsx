import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { CicloVidaView } from "./ciclo-vida-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import {
  getConteoEstados,
  getMovimientosRecientes,
} from "@/lib/lifecycle/queries";
import type { EstadoEstudiante } from "@/lib/lifecycle/types";

export const metadata: Metadata = { title: "Ciclo de vida" };
export const dynamic = "force-dynamic";

export default async function CicloVidaPage() {
  await requireRole(["director", "coordinador", "secretaria"]);

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader
          title="Ciclo de vida del estudiante"
          description="Estados, RNE y transferencias."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [estudiantes, conteo, movimientos] = await Promise.all([
    getEstudiantes(sede.id),
    getConteoEstados(),
    getMovimientosRecientes(25),
  ]);

  return (
    <div>
      <PageHeader
        title="Ciclo de vida del estudiante"
        description={`${sede.nombre} · Estados, RNE y transferencias`}
      />
      <CicloVidaView
        conteo={conteo}
        estudiantes={estudiantes.map((e) => ({
          id: e.id,
          nombre: `${e.apellidos}, ${e.nombres}`,
          codigo: e.codigo,
          rne: e.rne,
          estado: e.estado as EstadoEstudiante,
        }))}
        movimientos={movimientos.map((m) => ({
          id: m.id,
          estudiante: m.estudiante,
          codigo: m.codigo,
          tipo: m.tipo,
          motivo: m.motivo,
          fecha: m.fecha,
        }))}
      />
    </div>
  );
}
