import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  PortalEstudiante,
  PortalCalificacion,
  PortalAsistencia,
  PortalCargo,
} from "@/lib/portal/types";

export async function getPortalEstudiantes(): Promise<PortalEstudiante[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_estudiantes");
  return ((data as PortalEstudiante[]) ?? []).map((e) => ({
    ...e,
    pendiente: Number(e.pendiente),
    bloqueado: Boolean(e.bloqueado),
  }));
}

export async function getPortalCalificaciones(
  estudianteId: string,
): Promise<PortalCalificacion[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_calificaciones", {
    p_est: estudianteId,
  });
  return ((data as PortalCalificacion[]) ?? []).map((c) => ({
    asignatura: c.asignatura,
    promedio: Number(c.promedio),
  }));
}

export async function getPortalAsistencia(
  estudianteId: string,
): Promise<PortalAsistencia> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("portal_asistencia", { p_est: estudianteId })
    .maybeSingle<PortalAsistencia>();
  const r = data ?? {
    presente: 0,
    ausente: 0,
    tardanza: 0,
    excusa: 0,
    retiro: 0,
    total: 0,
  };
  return {
    presente: Number(r.presente),
    ausente: Number(r.ausente),
    tardanza: Number(r.tardanza),
    excusa: Number(r.excusa),
    retiro: Number(r.retiro),
    total: Number(r.total),
  };
}

export async function getPortalFinanzas(
  estudianteId: string,
): Promise<PortalCargo[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_finanzas", {
    p_est: estudianteId,
  });
  return ((data as PortalCargo[]) ?? []).map((c) => ({
    concepto: c.concepto,
    monto: Number(c.monto),
    vencimiento: c.vencimiento,
    estado: c.estado,
    vencido: Boolean(c.vencido),
  }));
}
