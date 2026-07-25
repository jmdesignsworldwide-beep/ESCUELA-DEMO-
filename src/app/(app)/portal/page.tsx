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

  const [calificaciones, asistencia, finanzas] = await Promise.all([
    getPortalCalificaciones(seleccionado.estudiante_id),
    getPortalAsistencia(seleccionado.estudiante_id),
    getPortalFinanzas(seleccionado.estudiante_id),
  ]);

  return (
    <PortalView
      esTutor={profile.role === "tutor" || profile.role === "director"}
      nombreUsuario={profile.nombre_completo}
      estudiantes={estudiantes}
      seleccionado={seleccionado}
      calificaciones={calificaciones}
      asistencia={asistencia}
      finanzas={finanzas}
    />
  );
}
