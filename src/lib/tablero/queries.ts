import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AlertaEjecutiva,
  TableroEjecutivo,
} from "@/lib/tablero/types";

export type {
  AlertaEjecutiva,
  Severidad,
  TableroEjecutivo,
} from "@/lib/tablero/types";
export {
  SEVERIDAD_STYLES,
  TONO_STYLES,
  tonoAscendente,
} from "@/lib/tablero/types";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getTableroEjecutivo(
  anioId: string,
): Promise<TableroEjecutivo | null> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("tablero_ejecutivo", { p_anio: anioId })
    .maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    estudiantes_activos: num(d.estudiantes_activos),
    docentes_activos: num(d.docentes_activos),
    cupo_total: num(d.cupo_total),
    ocupacion_pct: num(d.ocupacion_pct),
    esperado_mes: num(d.esperado_mes),
    cobrado_mes: num(d.cobrado_mes),
    tasa_cobro_mes: num(d.tasa_cobro_mes),
    morosidad_saldo: num(d.morosidad_saldo),
    familias_morosas: num(d.familias_morosas),
    familias_total: num(d.familias_total),
    deuda_90mas: num(d.deuda_90mas),
    asistencia_pct: num(d.asistencia_pct),
    riesgo_asistencia: num(d.riesgo_asistencia),
    promedio_general:
      d.promedio_general == null ? null : num(d.promedio_general),
    admisiones_pendientes: num(d.admisiones_pendientes),
    admisiones_aceptadas: num(d.admisiones_aceptadas),
  };
}

export async function getAlertasEjecutivas(
  anioId: string,
): Promise<AlertaEjecutiva[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("alertas_ejecutivas", {
    p_anio: anioId,
  });
  return ((data as AlertaEjecutiva[] | null) ?? []).map((a) => ({
    ...a,
    orden: num(a.orden),
  }));
}
