import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  BandaDesempeno,
  BoletinAreaRow,
  BoletinDetalleRow,
  BoletinFundamentalRow,
  CalificacionCompetencia,
  CompetenciaEspecifica,
  CompetenciaFundamental,
} from "@/lib/competencias/types";

function num<T>(row: T, keys: (keyof T)[]): T {
  const out = { ...row };
  for (const k of keys) out[k] = Number(out[k]) as T[keyof T];
  return out;
}

export async function getCompetenciasFundamentales(
  sedeId: string,
): Promise<CompetenciaFundamental[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("competencias_fundamentales")
    .select("id, codigo, nombre, descripcion, orden")
    .eq("sede_id", sedeId)
    .eq("activa", true)
    .order("orden");
  return (data as CompetenciaFundamental[]) ?? [];
}

export async function getCompetenciasEspecificas(
  asignaturaId: string,
): Promise<CompetenciaEspecifica[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("competencias_especificas")
    .select("id, asignatura_id, codigo, nombre, orden")
    .eq("asignatura_id", asignaturaId)
    .eq("activa", true)
    .order("orden");
  return (data as CompetenciaEspecifica[]) ?? [];
}

export async function getBandasDesempeno(
  sedeId: string,
): Promise<BandaDesempeno[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("bandas_desempeno")
    .select("id, nombre_corto, etiqueta, min_valor, max_valor, color, orden")
    .eq("sede_id", sedeId)
    .order("orden");
  return ((data as BandaDesempeno[]) ?? []).map((b) =>
    num(b, ["min_valor", "max_valor"]),
  );
}

export async function getLibroCompetencias(
  seccionId: string,
  asignaturaId: string,
  periodoId: string,
): Promise<CalificacionCompetencia[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("calificacion_competencias")
    .select(
      "id, seccion_id, asignatura_id, periodo_id, estudiante_id, fundamental_id, especifica_id, valor",
    )
    .eq("seccion_id", seccionId)
    .eq("asignatura_id", asignaturaId)
    .eq("periodo_id", periodoId);
  return ((data as CalificacionCompetencia[]) ?? []).map((c) =>
    num(c, ["valor"]),
  );
}

// Boletín RPCs ─────────────────────────────────────────────────────────────
export async function getBoletinAreas(
  estudianteId: string,
  periodoId: string,
): Promise<BoletinAreaRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("boletin_comp_areas", {
    p_est: estudianteId,
    p_periodo: periodoId,
  });
  return ((data as BoletinAreaRow[]) ?? []).map((r) => ({
    ...r,
    nota_area: Number(r.nota_area),
    min_aprob: r.min_aprob === null ? null : Number(r.min_aprob),
  }));
}

export async function getBoletinDetalle(
  estudianteId: string,
  periodoId: string,
): Promise<BoletinDetalleRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("boletin_comp_detalle", {
    p_est: estudianteId,
    p_periodo: periodoId,
  });
  return ((data as BoletinDetalleRow[]) ?? []).map((r) => ({
    ...r,
    valor: Number(r.valor),
  }));
}

export async function getBoletinFundamentales(
  estudianteId: string,
  periodoId: string,
): Promise<BoletinFundamentalRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("boletin_comp_fundamentales", {
    p_est: estudianteId,
    p_periodo: periodoId,
  });
  return ((data as BoletinFundamentalRow[]) ?? []).map((r) => ({
    ...r,
    promedio: Number(r.promedio),
  }));
}
