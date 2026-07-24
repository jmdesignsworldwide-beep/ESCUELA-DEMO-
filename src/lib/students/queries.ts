import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Estudiante,
  EstudianteTutor,
  Matricula,
  Tutor,
} from "@/lib/students/types";

export async function getEstudiantes(sedeId: string): Promise<Estudiante[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("sede_id", sedeId)
    .order("apellidos")
    .order("nombres");
  return (data as Estudiante[]) ?? [];
}

export async function getEstudiante(id: string): Promise<Estudiante | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Estudiante>();
  return data ?? null;
}

/** Todas las matrículas de un año (para resolver sección en el listado). */
export async function getMatriculasAnio(anioId: string): Promise<Matricula[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("matriculas")
    .select("*")
    .eq("anio_id", anioId);
  return (data as Matricula[]) ?? [];
}

/** Historial de matrículas de un estudiante (todos los años). */
export async function getMatriculasEstudiante(
  estudianteId: string,
): Promise<Matricula[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("matriculas")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .order("fecha", { ascending: false });
  return (data as Matricula[]) ?? [];
}

/** Tutores vinculados a un estudiante, con datos del tutor. */
export async function getTutoresDeEstudiante(
  estudianteId: string,
): Promise<EstudianteTutor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiante_tutores")
    .select("*, tutor:tutores(*)")
    .eq("estudiante_id", estudianteId)
    .order("principal", { ascending: false });
  return (data as EstudianteTutor[]) ?? [];
}

/** Hermanos (mismo núcleo familiar), excluyendo al propio estudiante. */
export async function getHermanos(
  familiaId: string | null,
  excluirId: string,
): Promise<Estudiante[]> {
  if (!familiaId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiantes")
    .select("*")
    .eq("familia_id", familiaId)
    .neq("id", excluirId)
    .order("fecha_nacimiento");
  return (data as Estudiante[]) ?? [];
}

export async function getTutores(sedeId: string): Promise<Tutor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tutores")
    .select("*")
    .eq("sede_id", sedeId)
    .order("apellidos");
  return (data as Tutor[]) ?? [];
}

/** Signed URL de corta vida para la foto privada del estudiante. */
export async function getFotoSignedUrl(
  fotoPath: string | null,
): Promise<string | null> {
  if (!fotoPath) return null;
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("estudiantes")
    .createSignedUrl(fotoPath, 60 * 10);
  return data?.signedUrl ?? null;
}
