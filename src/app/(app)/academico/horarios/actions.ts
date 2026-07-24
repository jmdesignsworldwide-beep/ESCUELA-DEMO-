"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getAnioActivo } from "@/lib/academic/queries";
import { PERIODOS } from "@/lib/schedule/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const bloqueSchema = z.object({
  seccion_id: z.string().uuid(),
  asignacion_id: z.string().uuid(),
  aula_id: z.string().uuid().optional().or(z.literal("")),
  dia_semana: z.coerce.number().int().min(1).max(5),
  periodo: z.coerce.number().int().min(1).max(PERIODOS.length),
});

/** Agregar un bloque de horario. La BD rechaza conflictos (EXCLUDE). */
export async function agregarBloqueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const parsed = bloqueSchema.safeParse({
    seccion_id: formData.get("seccion_id"),
    asignacion_id: formData.get("asignacion_id"),
    aula_id: formData.get("aula_id"),
    dia_semana: formData.get("dia_semana"),
    periodo: formData.get("periodo"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();

  // Resolver asignatura + docente desde la asignación.
  const { data: asignacion } = await supabase
    .from("docente_secciones")
    .select("empleado_id, asignatura_id")
    .eq("id", parsed.data.asignacion_id)
    .maybeSingle<{ empleado_id: string; asignatura_id: string }>();
  if (!asignacion) return { error: "Asignación no encontrada." };

  const periodo = PERIODOS[parsed.data.periodo - 1];
  if (!periodo) return { error: "Período no válido." };

  const { error } = await supabase.from("horarios").insert({
    anio_id: anio.id,
    seccion_id: parsed.data.seccion_id,
    asignatura_id: asignacion.asignatura_id,
    empleado_id: asignacion.empleado_id,
    aula_id: parsed.data.aula_id || null,
    dia_semana: parsed.data.dia_semana,
    hora_inicio: periodo.inicio,
    hora_fin: periodo.fin,
  });

  if (error) {
    // 23P01 = exclusion_violation → conflicto de horario.
    if (error.code === "23P01") {
      const quien = error.message.includes("docente")
        ? "el docente ya tiene clase"
        : error.message.includes("aula")
          ? "el aula ya está ocupada"
          : "la sección ya tiene clase";
      return {
        error: `Conflicto de horario: ${quien} en esa franja.`,
      };
    }
    return { error: "No se pudo agregar el bloque." };
  }

  revalidatePath("/academico/horarios");
  return { ok: true };
}

export async function quitarBloqueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  if (error) return { error: "No se pudo quitar el bloque." };

  revalidatePath("/academico/horarios");
  return { ok: true };
}
