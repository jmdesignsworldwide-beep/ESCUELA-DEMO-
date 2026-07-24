import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AreaDesarrollo,
  IndicadorLogro,
  EvaluacionInicial,
  ObservacionInicial,
} from "@/lib/inicial/types";

export async function getAreas(sedeId: string): Promise<AreaDesarrollo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("areas_desarrollo")
    .select("*")
    .eq("sede_id", sedeId)
    .order("orden");
  return (data as AreaDesarrollo[]) ?? [];
}

export async function getIndicadores(
  sedeId: string,
): Promise<IndicadorLogro[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("indicadores_logro")
    .select("*, areas_desarrollo!inner(sede_id)")
    .eq("areas_desarrollo.sede_id", sedeId)
    .order("orden");
  return ((data as (IndicadorLogro & { areas_desarrollo?: unknown })[]) ?? []).map(
    ({ areas_desarrollo: _omit, ...i }) => i,
  );
}

export async function getEvaluacionesEstudiante(
  estudianteId: string,
  periodoId: string,
): Promise<EvaluacionInicial[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("evaluaciones_inicial")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .eq("periodo_id", periodoId);
  return (data as EvaluacionInicial[]) ?? [];
}

export async function getObservacion(
  estudianteId: string,
  periodoId: string,
): Promise<ObservacionInicial | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("observaciones_inicial")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .eq("periodo_id", periodoId)
    .maybeSingle<ObservacionInicial>();
  return data ?? null;
}
