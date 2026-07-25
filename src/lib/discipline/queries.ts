import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Incidencia,
  ResumenDisciplina,
  ConductaPortal,
} from "@/lib/discipline/types";

export async function getIncidencias(sedeId: string): Promise<Incidencia[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("incidencias_disciplina")
    .select("*")
    .eq("sede_id", sedeId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data as Incidencia[]) ?? []).map((i) => ({
    ...i,
    puntos: Number(i.puntos),
  }));
}

export async function getResumenDisciplina(
  estudianteId: string,
): Promise<ResumenDisciplina> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("resumen_disciplina", { p_est: estudianteId })
    .maybeSingle<ResumenDisciplina>();
  const r = data ?? { meritos: 0, demeritos: 0, puntos: 0 };
  return {
    meritos: Number(r.meritos),
    demeritos: Number(r.demeritos),
    puntos: Number(r.puntos),
  };
}

export async function getConductaPortal(
  estudianteId: string,
): Promise<ConductaPortal[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_disciplina", {
    p_est: estudianteId,
  });
  return ((data as ConductaPortal[]) ?? []).map((c) => ({
    ...c,
    puntos: Number(c.puntos),
  }));
}
