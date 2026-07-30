import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface NivelNorma {
  id: string;
  nombre: string;
  min_aprobacion: number | null;
}

export interface GradoNorma {
  id: string;
  nombre: string;
  nivel_id: string;
  nivel_nombre: string;
  orden: number;
  permite_repitencia: boolean;
}

export interface ConfigAcademica {
  asistencia_minima: number;
}

export async function getNivelesNorma(sedeId: string): Promise<NivelNorma[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("niveles")
    .select("id, nombre, min_aprobacion")
    .eq("sede_id", sedeId)
    .order("orden");
  return ((data as NivelNorma[]) ?? []).map((n) => ({
    ...n,
    min_aprobacion: n.min_aprobacion === null ? null : Number(n.min_aprobacion),
  }));
}

export async function getGradosNorma(sedeId: string): Promise<GradoNorma[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("grados")
    .select("id, nombre, nivel_id, orden, permite_repitencia, niveles!inner(nombre, sede_id, orden)")
    .eq("niveles.sede_id", sedeId)
    .order("orden");
  const rows =
    (data as unknown as {
      id: string;
      nombre: string;
      nivel_id: string;
      orden: number;
      permite_repitencia: boolean;
      niveles: { nombre: string; orden: number };
    }[]) ?? [];
  return rows
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      nivel_id: g.nivel_id,
      nivel_nombre: g.niveles?.nombre ?? "",
      orden: g.orden,
      permite_repitencia: g.permite_repitencia,
    }))
    .sort((a, b) => a.nivel_nombre.localeCompare(b.nivel_nombre) || a.orden - b.orden);
}

export async function getConfigAcademica(
  sedeId: string,
): Promise<ConfigAcademica> {
  const supabase = createClient();
  const { data } = await supabase
    .from("config_academica")
    .select("asistencia_minima")
    .eq("sede_id", sedeId)
    .maybeSingle<{ asistencia_minima: number }>();
  return { asistencia_minima: Number(data?.asistencia_minima ?? 80) };
}
