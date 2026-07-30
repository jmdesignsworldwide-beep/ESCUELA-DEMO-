import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PortalView } from "./portal-view";
import { PortalVacio } from "./portal-vacio";
import {
  getPortalEstudiantes,
  getPortalCalificaciones,
  getPortalAsistencia,
  getPortalFinanzas,
} from "@/lib/portal/queries";
import { getCircularesVisibles } from "@/lib/comms/queries";
import { getConductaPortal } from "@/lib/discipline/queries";
import { getAnioActivo } from "@/lib/academic/queries";
import {
  getPortalAsistenciaPct,
  getPortalAsistenciaMensual,
  getPortalAsistenciaPeriodo,
} from "@/lib/attendance/analytics";

// Umbral estándar MINERD de asistencia visible a la familia (Ord. 04-2023).
const ASISTENCIA_MINIMA = 80;

export const metadata: Metadata = { title: "Portal de familias" };
export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { e?: string };
}) {
  const { profile } = await requireRole(["tutor", "estudiante"]);

  const estudiantes = await getPortalEstudiantes();
  const primero = estudiantes[0];
  if (!primero) {
    return <PortalVacio nombre={profile.nombre_completo} />;
  }

  const selId = searchParams.e ?? primero.estudiante_id;
  const seleccionado =
    estudiantes.find((e) => e.estudiante_id === selId) ?? primero;

  const anio = await getAnioActivo();
  const est = seleccionado.estudiante_id;

  const [
    calificaciones,
    asistencia,
    finanzas,
    circulares,
    conducta,
    asisPct,
    asisMensual,
    asisPeriodo,
  ] = await Promise.all([
    getPortalCalificaciones(est),
    getPortalAsistencia(est),
    getPortalFinanzas(est),
    getCircularesVisibles(),
    getConductaPortal(est),
    anio ? getPortalAsistenciaPct(est, anio.id) : Promise.resolve(100),
    anio ? getPortalAsistenciaMensual(est, anio.id) : Promise.resolve([]),
    anio ? getPortalAsistenciaPeriodo(est, anio.id) : Promise.resolve([]),
  ]);

  return (
    <PortalView
      esTutor={profile.role === "tutor" || profile.role === "director"}
      nombreUsuario={profile.nombre_completo}
      estudiantes={estudiantes}
      seleccionado={seleccionado}
      calificaciones={calificaciones}
      asistencia={asistencia}
      asistenciaPct={asisPct}
      asistenciaMensual={asisMensual}
      asistenciaPeriodo={asisPeriodo}
      asistenciaMinima={ASISTENCIA_MINIMA}
      finanzas={finanzas}
      circulares={circulares}
      conducta={conducta}
    />
  );
}
