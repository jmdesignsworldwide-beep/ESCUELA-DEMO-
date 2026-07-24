import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Sede, AnioEscolar } from "@/lib/types";
import type {
  Periodo,
  Nivel,
  Grado,
  Jornada,
  Aula,
  Asignatura,
  Seccion,
  PensumItem,
  EsquemaPonderacion,
  ComponentePonderacion,
} from "@/lib/academic/types";

/** Sede activa (una por defecto en el demo). */
export async function getSedeActiva(): Promise<Sede | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sedes")
    .select("*")
    .eq("activa", true)
    .order("codigo")
    .limit(1)
    .maybeSingle<Sede>();
  return data ?? null;
}

/** Año escolar activo. */
export async function getAnioActivo(): Promise<AnioEscolar | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("anios_escolares")
    .select("*")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle<AnioEscolar>();
  return data ?? null;
}

export async function getPeriodos(anioId: string): Promise<Periodo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("periodos")
    .select("*")
    .eq("anio_id", anioId)
    .order("orden");
  return (data as Periodo[]) ?? [];
}

export async function getNiveles(sedeId: string): Promise<Nivel[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("niveles")
    .select("*")
    .eq("sede_id", sedeId)
    .order("orden");
  return (data as Nivel[]) ?? [];
}

export async function getGrados(sedeId: string): Promise<Grado[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("grados")
    .select("*, niveles!inner(sede_id)")
    .eq("niveles.sede_id", sedeId)
    .order("orden");
  // Quitar el join anidado del objeto devuelto.
  return ((data as (Grado & { niveles?: unknown })[]) ?? []).map(
    ({ niveles: _omit, ...g }) => g,
  );
}

export async function getJornadas(sedeId: string): Promise<Jornada[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("jornadas")
    .select("*")
    .eq("sede_id", sedeId)
    .order("orden");
  return (data as Jornada[]) ?? [];
}

export async function getAulas(sedeId: string): Promise<Aula[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("aulas")
    .select("*")
    .eq("sede_id", sedeId)
    .order("codigo");
  return (data as Aula[]) ?? [];
}

export async function getAsignaturas(sedeId: string): Promise<Asignatura[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("asignaturas")
    .select("*")
    .eq("sede_id", sedeId)
    .order("nombre");
  return (data as Asignatura[]) ?? [];
}

export async function getSecciones(anioId: string): Promise<Seccion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("secciones")
    .select("*")
    .eq("anio_id", anioId);
  return (data as Seccion[]) ?? [];
}

export async function getPensum(gradoId: string): Promise<PensumItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pensum")
    .select("*")
    .eq("grado_id", gradoId)
    .order("orden");
  return (data as PensumItem[]) ?? [];
}

/** Todo el pénsum de la sede (para resolver por grado en el cliente). */
export async function getPensumSede(sedeId: string): Promise<PensumItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pensum")
    .select("*, grados!inner(nivel_id, niveles!inner(sede_id))")
    .eq("grados.niveles.sede_id", sedeId)
    .order("orden");
  return ((data as (PensumItem & { grados?: unknown })[]) ?? []).map(
    ({ grados: _omit, ...p }) => p,
  );
}

export async function getEsquemasPonderacion(
  sedeId: string,
): Promise<EsquemaPonderacion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("esquemas_ponderacion")
    .select("*")
    .eq("sede_id", sedeId)
    .order("nombre");
  return (data as EsquemaPonderacion[]) ?? [];
}

export async function getComponentes(
  esquemaId: string,
): Promise<ComponentePonderacion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ponderacion_componentes")
    .select("*")
    .eq("esquema_id", esquemaId)
    .order("orden");
  return (data as ComponentePonderacion[]) ?? [];
}
