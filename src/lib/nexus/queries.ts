import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MiAccesoDemo, AccesoDemo } from "@/lib/nexus/types";

/** Estado de vigencia del usuario actual (null si no es cuenta demo). */
export async function getMiAccesoDemo(): Promise<MiAccesoDemo | null> {
  const supabase = createClient();
  const { data } = await supabase.rpc("mi_acceso_demo").maybeSingle<MiAccesoDemo>();
  if (!data) return null;
  return {
    activa: Boolean(data.activa),
    vence_at: data.vence_at,
    dias_restantes:
      data.dias_restantes === null ? null : Number(data.dias_restantes),
    sin_vencimiento: Boolean(data.sin_vencimiento),
    bloqueado: Boolean(data.bloqueado),
  };
}

export async function esSuperAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.rpc("es_superadmin");
  return data === true;
}

export async function getAccesos(): Promise<AccesoDemo[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("nexus_listar_accesos");
  return ((data as AccesoDemo[]) ?? []).map((a) => ({
    ...a,
    dias_restantes: a.dias_restantes === null ? null : Number(a.dias_restantes),
  }));
}
