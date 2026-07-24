import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Empleado,
  DocenteSeccion,
  EmpleadoDocumento,
} from "@/lib/staff/types";

export async function getEmpleados(sedeId: string): Promise<Empleado[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("empleados")
    .select("*")
    .eq("sede_id", sedeId)
    .order("apellidos")
    .order("nombres");
  return (data as Empleado[]) ?? [];
}

export async function getEmpleado(id: string): Promise<Empleado | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .maybeSingle<Empleado>();
  return data ?? null;
}

export async function getAsignacionesEmpleado(
  empleadoId: string,
): Promise<DocenteSeccion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("docente_secciones")
    .select("*")
    .eq("empleado_id", empleadoId);
  return (data as DocenteSeccion[]) ?? [];
}

/** Total de asignaciones por empleado (para el listado). */
export async function getConteoAsignaciones(
  anioId: string,
): Promise<Map<string, { asignaciones: number; horas: number }>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("docente_secciones")
    .select("empleado_id, horas_semanales")
    .eq("anio_id", anioId);
  const map = new Map<string, { asignaciones: number; horas: number }>();
  for (const r of (data as { empleado_id: string; horas_semanales: number }[]) ??
    []) {
    const cur = map.get(r.empleado_id) ?? { asignaciones: 0, horas: 0 };
    cur.asignaciones += 1;
    cur.horas += r.horas_semanales;
    map.set(r.empleado_id, cur);
  }
  return map;
}

export async function getDocumentosEmpleado(
  empleadoId: string,
): Promise<EmpleadoDocumento[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("empleado_documentos")
    .select("*")
    .eq("empleado_id", empleadoId)
    .order("created_at", { ascending: false });
  return (data as EmpleadoDocumento[]) ?? [];
}

export async function getFotoEmpleadoSignedUrl(
  fotoPath: string | null,
): Promise<string | null> {
  if (!fotoPath) return null;
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("empleados")
    .createSignedUrl(fotoPath, 60 * 10);
  return data?.signedUrl ?? null;
}
