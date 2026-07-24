import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HorarioBloque } from "@/lib/schedule/types";

export async function getHorarios(anioId: string): Promise<HorarioBloque[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("horarios")
    .select("*")
    .eq("anio_id", anioId)
    .order("dia_semana")
    .order("hora_inicio");
  return (data as HorarioBloque[]) ?? [];
}
