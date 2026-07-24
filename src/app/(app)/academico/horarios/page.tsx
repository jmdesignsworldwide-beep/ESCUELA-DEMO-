import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { HorariosView } from "./horarios-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getAsignaturas,
  getAulas,
} from "@/lib/academic/queries";
import { getEmpleados, getAsignacionesAnio } from "@/lib/staff/queries";
import { getHorarios } from "@/lib/schedule/queries";

export const metadata: Metadata = { title: "Horarios" };

export default async function HorariosPage() {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "docente",
  ]);
  const canWrite = profile.role === "director" || profile.role === "coordinador";

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="Horarios" description="Horario por sección, docente y aula." />
        <EstructuraVacia />
      </div>
    );
  }

  const [
    niveles,
    grados,
    secciones,
    asignaturas,
    aulas,
    empleados,
    asignaciones,
    horarios,
  ] = await Promise.all([
    getNiveles(sede.id),
    getGrados(sede.id),
    getSecciones(anio.id),
    getAsignaturas(sede.id),
    getAulas(sede.id),
    getEmpleados(sede.id),
    getAsignacionesAnio(anio.id),
    getHorarios(anio.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Horarios"
        description={`${sede.nombre} · ${anio.nombre}`}
        actions={<Badge variant="gold">{horarios.length} bloques</Badge>}
      />
      <HorariosView
        canWrite={canWrite}
        horarios={horarios}
        niveles={niveles}
        grados={grados}
        secciones={secciones}
        asignaturas={asignaturas}
        aulas={aulas}
        empleados={empleados}
        asignaciones={asignaciones}
      />
    </div>
  );
}
