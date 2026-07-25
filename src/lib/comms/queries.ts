import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Circular,
  CircularVisible,
  DestinatarioCircular,
} from "@/lib/comms/types";

export async function getCirculares(sedeId: string): Promise<Circular[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("circulares")
    .select("*")
    .eq("sede_id", sedeId)
    .order("created_at", { ascending: false });
  return (data as Circular[]) ?? [];
}

export async function getCircular(id: string): Promise<Circular | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("circulares")
    .select("*")
    .eq("id", id)
    .maybeSingle<Circular>();
  return data ?? null;
}

export async function getCircularesVisibles(): Promise<CircularVisible[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("circulares_visibles");
  return (data as CircularVisible[]) ?? [];
}

export async function getDestinatarios(
  circularId: string,
): Promise<DestinatarioCircular[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("destinatarios_circular", {
    p_circular: circularId,
  });
  return (data as DestinatarioCircular[]) ?? [];
}
