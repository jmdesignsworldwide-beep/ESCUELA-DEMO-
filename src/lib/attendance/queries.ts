import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AsistenciaSesion,
  AsistenciaRegistro,
  ResumenAsistencia,
  Ausentismo,
} from "@/lib/attendance/types";

/** Sesión diaria (asignatura nula) de una sección en una fecha. */
export async function getSesionDiaria(
  seccionId: string,
  fecha: string,
): Promise<AsistenciaSesion | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("asistencia_sesiones")
    .select("*")
    .eq("seccion_id", seccionId)
    .eq("fecha", fecha)
    .is("asignatura_id", null)
    .maybeSingle<AsistenciaSesion>();
  return data ?? null;
}

export async function getRegistros(
  sesionId: string,
): Promise<AsistenciaRegistro[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("asistencia_registros")
    .select("*")
    .eq("sesion_id", sesionId);
  return (data as AsistenciaRegistro[]) ?? [];
}

export async function getResumenAsistencia(
  anioId: string,
): Promise<ResumenAsistencia[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("resumen_asistencia", { p_anio: anioId });
  return (data as ResumenAsistencia[]) ?? [];
}

export async function getAusentismo(
  anioId: string,
  umbral: number,
): Promise<Ausentismo[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("ausentismo", {
    p_anio: anioId,
    p_umbral: umbral,
  });
  return (data as Ausentismo[]) ?? [];
}
