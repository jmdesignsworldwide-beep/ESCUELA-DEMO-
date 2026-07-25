import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  InventarioItem,
  LibroCatalogo,
  Prestamo,
} from "@/lib/inventory/types";

export async function getInventario(
  sedeId: string,
): Promise<InventarioItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("inventario_items")
    .select("*")
    .eq("sede_id", sedeId)
    .order("codigo");
  return ((data as InventarioItem[]) ?? []).map((i) => ({
    ...i,
    cantidad: Number(i.cantidad),
    valor_unitario: Number(i.valor_unitario),
  }));
}

export async function getCatalogo(): Promise<LibroCatalogo[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("catalogo_biblioteca");
  return ((data as LibroCatalogo[]) ?? []).map((l) => ({
    ...l,
    ejemplares_total: Number(l.ejemplares_total),
    prestados: Number(l.prestados),
    disponibles: Number(l.disponibles),
  }));
}

export async function getPrestamosActivos(): Promise<Prestamo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("prestamos")
    .select("*")
    .is("devuelto_at", null)
    .order("fecha", { ascending: false });
  return (data as Prestamo[]) ?? [];
}
