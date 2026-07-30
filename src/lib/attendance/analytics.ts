import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AsistenciaDashboard,
  AsistenciaMes,
  AsistenciaNivel,
  AsistenciaPeriodo,
  AsistenciaSeccionResumen,
  TendenciaMes,
} from "@/lib/attendance/analytics-types";

export type {
  AsistenciaDashboard,
  AsistenciaMes,
  AsistenciaNivel,
  AsistenciaPeriodo,
  AsistenciaSeccionResumen,
  TendenciaMes,
};

export async function getAsistenciaDashboard(
  anioId: string,
): Promise<AsistenciaDashboard> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("asistencia_dashboard", { p_anio: anioId })
    .maybeSingle<AsistenciaDashboard>();
  return {
    registros: Number(data?.registros ?? 0),
    pct_global: Number(data?.pct_global ?? 0),
    estudiantes_total: Number(data?.estudiantes_total ?? 0),
    estudiantes_riesgo: Number(data?.estudiantes_riesgo ?? 0),
  };
}

export async function getAsistenciaTendencia(
  anioId: string,
): Promise<TendenciaMes[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("asistencia_tendencia", { p_anio: anioId });
  return ((data as TendenciaMes[]) ?? []).map((r) => ({
    anio_cal: Number(r.anio_cal),
    mes: Number(r.mes),
    pct: Number(r.pct),
    registros: Number(r.registros),
  }));
}

export async function getAsistenciaPorNivel(
  anioId: string,
): Promise<AsistenciaNivel[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("asistencia_por_nivel", { p_anio: anioId });
  return ((data as AsistenciaNivel[]) ?? []).map((r) => ({
    nivel: r.nivel,
    nivel_orden: Number(r.nivel_orden),
    pct: Number(r.pct),
    registros: Number(r.registros),
  }));
}

export async function getAsistenciaSeccionResumen(
  anioId: string,
  seccionId: string,
): Promise<AsistenciaSeccionResumen[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("asistencia_seccion_resumen", {
    p_anio: anioId,
    p_seccion: seccionId,
  });
  return ((data as AsistenciaSeccionResumen[]) ?? []).map((r) => ({
    estudiante_id: r.estudiante_id,
    dias: Number(r.dias),
    presentes: Number(r.presentes),
    ausencias: Number(r.ausencias),
    tardanzas: Number(r.tardanzas),
    pct: Number(r.pct),
    en_riesgo: Boolean(r.en_riesgo),
  }));
}

// Portal ────────────────────────────────────────────────────────────────
export async function getPortalAsistenciaPct(
  estudianteId: string,
  anioId: string,
): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_asistencia_pct", {
    p_est: estudianteId,
    p_anio: anioId,
  });
  return Number(data ?? 100);
}

export async function getPortalAsistenciaMensual(
  estudianteId: string,
  anioId: string,
): Promise<AsistenciaMes[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_asistencia_mensual", {
    p_est: estudianteId,
    p_anio: anioId,
  });
  return ((data as AsistenciaMes[]) ?? []).map((r) => ({
    anio_cal: Number(r.anio_cal),
    mes: Number(r.mes),
    presentes: Number(r.presentes),
    ausencias: Number(r.ausencias),
    pct: Number(r.pct),
  }));
}

export async function getPortalAsistenciaPeriodo(
  estudianteId: string,
  anioId: string,
): Promise<AsistenciaPeriodo[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_asistencia_periodo", {
    p_est: estudianteId,
    p_anio: anioId,
  });
  return ((data as AsistenciaPeriodo[]) ?? []).map((r) => ({
    orden: Number(r.orden),
    nombre: r.nombre,
    pct: Number(r.pct),
  }));
}
