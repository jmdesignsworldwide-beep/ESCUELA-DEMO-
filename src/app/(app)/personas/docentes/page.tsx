import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DocentesLista, type EmpleadoRow } from "./docentes-lista";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import { getEmpleados, getConteoAsignaciones } from "@/lib/staff/queries";

export const metadata: Metadata = { title: "Docentes y personal" };

export default async function DocentesPage() {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "secretaria",
  ]);
  const canWrite = profile.role === "director" || profile.role === "secretaria";

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede) {
    return (
      <div>
        <PageHeader
          title="Docentes y personal"
          description="Expediente del personal y asignaciones."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [empleados, conteo] = await Promise.all([
    getEmpleados(sede.id),
    anio ? getConteoAsignaciones(anio.id) : Promise.resolve(new Map()),
  ]);

  const rows: EmpleadoRow[] = empleados.map((e) => {
    const c = conteo.get(e.id);
    return {
      id: e.id,
      codigo: e.codigo,
      nombres: e.nombres,
      apellidos: e.apellidos,
      tipo: e.tipo,
      cargo: e.cargo,
      estado: e.estado,
      asignaciones: c?.asignaciones ?? 0,
      horas: c?.horas ?? 0,
    };
  });

  const docentes = rows.filter((r) => r.tipo === "docente").length;

  return (
    <div>
      <PageHeader
        title="Docentes y personal"
        description={`${sede.nombre} · Nómina de personal`}
        actions={
          <Badge variant="gold">
            {docentes} docentes · {rows.length} total
          </Badge>
        }
      />
      <DocentesLista rows={rows} canWrite={canWrite} />
    </div>
  );
}
