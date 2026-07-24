import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PromedioFinal, Recuperacion } from "@/lib/recovery/types";

export async function getPromediosFinales(
  anioId: string,
  seccionId: string,
): Promise<PromedioFinal[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("promedios_finales", {
    p_anio: anioId,
    p_seccion: seccionId,
  });
  return ((data as { estudiante_id: string; asignatura_id: string; promedio: number }[]) ??
    []).map((r) => ({
    estudiante_id: r.estudiante_id,
    asignatura_id: r.asignatura_id,
    promedio: Number(r.promedio),
  }));
}

export async function getRecuperaciones(
  anioId: string,
  seccionId: string,
): Promise<Recuperacion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("recuperaciones")
    .select("*")
    .eq("anio_id", anioId)
    .eq("seccion_id", seccionId);
  return ((data as (Recuperacion & { nota: number })[]) ?? []).map((r) => ({
    ...r,
    nota: Number(r.nota),
  }));
}
