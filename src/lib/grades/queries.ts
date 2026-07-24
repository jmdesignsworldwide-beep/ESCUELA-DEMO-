import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CalificacionComponente, LibroCierre } from "@/lib/grades/types";

export async function getLibro(
  seccionId: string,
  asignaturaId: string,
  periodoId: string,
): Promise<CalificacionComponente[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("calificacion_componentes")
    .select("*")
    .eq("seccion_id", seccionId)
    .eq("asignatura_id", asignaturaId)
    .eq("periodo_id", periodoId);
  return (data as CalificacionComponente[]) ?? [];
}

export async function getCierre(
  seccionId: string,
  asignaturaId: string,
  periodoId: string,
): Promise<LibroCierre | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("libro_cierres")
    .select("*")
    .eq("seccion_id", seccionId)
    .eq("asignatura_id", asignaturaId)
    .eq("periodo_id", periodoId)
    .maybeSingle<LibroCierre>();
  return data ?? null;
}
