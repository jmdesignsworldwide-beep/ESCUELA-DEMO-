import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Convalidacion,
  EstadoConteo,
  EstadoEstudiante,
  MovimientoEstudiante,
} from "@/lib/lifecycle/types";

export async function getConteoEstados(): Promise<EstadoConteo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiantes")
    .select("estado")
    .returns<{ estado: EstadoEstudiante }[]>();
  const map = new Map<EstadoEstudiante, number>();
  for (const r of data ?? []) {
    map.set(r.estado, (map.get(r.estado) ?? 0) + 1);
  }
  return [...map.entries()].map(([estado, cantidad]) => ({ estado, cantidad }));
}

export async function getMovimientosEstudiante(
  estudianteId: string,
): Promise<MovimientoEstudiante[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiante_movimientos")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .order("created_at", { ascending: false });
  return (data as MovimientoEstudiante[]) ?? [];
}

export async function getMovimientosRecientes(
  limit = 20,
): Promise<(MovimientoEstudiante & { estudiante: string; codigo: string })[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiante_movimientos")
    .select("*, estudiantes!inner(nombres, apellidos, codigo)")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows =
    (data as unknown as (MovimientoEstudiante & {
      estudiantes: { nombres: string; apellidos: string; codigo: string };
    })[]) ?? [];
  return rows.map((r) => ({
    ...r,
    estudiante: `${r.estudiantes.apellidos}, ${r.estudiantes.nombres}`,
    codigo: r.estudiantes.codigo,
  }));
}

export async function getConvalidaciones(
  estudianteId: string,
): Promise<Convalidacion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("convalidaciones")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .order("asignatura");
  return ((data as (Convalidacion & { nota: number })[]) ?? []).map((r) => ({
    ...r,
    nota: Number(r.nota),
  }));
}
