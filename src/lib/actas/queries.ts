import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CuadroHonorRow,
  PromedioAsignaturaRow,
  PromediosResumenRow,
  SituacionRow,
} from "@/lib/actas/types";

export async function getSituacionAcademica(
  anioId: string,
  seccionId: string,
): Promise<SituacionRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("situacion_academica", {
    p_anio: anioId,
    p_seccion: seccionId,
  });
  return ((data as SituacionRow[]) ?? []).map((r) => ({
    ...r,
    promedio_general:
      r.promedio_general === null ? null : Number(r.promedio_general),
    reprobadas: Number(r.reprobadas),
    asistencia: Number(r.asistencia),
  }));
}

export async function getPromediosAsignatura(
  anioId: string,
  seccionId: string,
): Promise<PromedioAsignaturaRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("promedios_asignatura", {
    p_anio: anioId,
    p_seccion: seccionId,
  });
  return ((data as PromedioAsignaturaRow[]) ?? []).map((r) => ({
    asignatura_id: r.asignatura_id,
    promedio: Number(r.promedio),
    aprobados: Number(r.aprobados),
    reprobados: Number(r.reprobados),
  }));
}

export async function getCuadroHonor(
  anioId: string,
  seccionId: string,
  umbral = 85,
): Promise<CuadroHonorRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("cuadro_honor", {
    p_anio: anioId,
    p_seccion: seccionId,
    p_umbral: umbral,
  });
  return ((data as CuadroHonorRow[]) ?? []).map((r) => ({
    estudiante_id: r.estudiante_id,
    promedio_general: Number(r.promedio_general),
    asistencia: Number(r.asistencia),
    puesto: Number(r.puesto),
  }));
}

export async function getPromediosResumen(
  anioId: string,
): Promise<PromediosResumenRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("promedios_resumen", { p_anio: anioId });
  return ((data as PromediosResumenRow[]) ?? []).map((r) => ({
    ...r,
    grado_orden: Number(r.grado_orden),
    nivel_orden: Number(r.nivel_orden),
    estudiantes: Number(r.estudiantes),
    promedio_general:
      r.promedio_general === null ? null : Number(r.promedio_general),
    promovidos: Number(r.promovidos),
    completivo: Number(r.completivo),
    reprobados: Number(r.reprobados),
    condicion_asistencia: Number(r.condicion_asistencia),
  }));
}
