import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ConfigInstitucional,
  EntradaBitacora,
  FiltroBitacora,
} from "@/lib/settings/types";

export async function getConfigInstitucional(
  sedeId: string,
): Promise<ConfigInstitucional | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("config_institucional")
    .select("*")
    .eq("sede_id", sedeId)
    .maybeSingle<ConfigInstitucional>();
  return data ?? null;
}

export async function getBitacora(
  filtro: FiltroBitacora = {},
): Promise<EntradaBitacora[]> {
  const supabase = createClient();
  let q = supabase
    .from("bitacora")
    .select("id, actor_email, accion, entidad, entidad_id, detalle, ip, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filtro.accion) q = q.eq("accion", filtro.accion);
  if (filtro.entidad) q = q.ilike("entidad", `%${filtro.entidad}%`);
  if (filtro.desde) q = q.gte("created_at", filtro.desde);

  const { data } = await q;
  return (data as EntradaBitacora[]) ?? [];
}

export async function getBitacoraAcciones(): Promise<
  { accion: string; total: number }[]
> {
  const supabase = createClient();
  const { data } = await supabase.rpc("bitacora_acciones");
  return ((data as { accion: string; total: number }[]) ?? []).map((r) => ({
    accion: r.accion,
    total: Number(r.total),
  }));
}
