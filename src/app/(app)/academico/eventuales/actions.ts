"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  estudiante_id: z.string().uuid(),
  asignatura_id: z.string().uuid().optional().or(z.literal("")),
  titulo: z.string().trim().min(2, "El título es obligatorio.").max(120),
  descripcion: z.string().trim().max(500).optional().or(z.literal("")),
  nota: z
    .union([z.coerce.number().min(0).max(100), z.literal("")])
    .optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export async function guardarEvaluacionEventualAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador", "docente"], {
    redirectOnFail: false,
  });

  const parsed = schema.safeParse({
    estudiante_id: formData.get("estudiante_id"),
    asignatura_id: formData.get("asignatura_id") ?? "",
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? "",
    nota: formData.get("nota") ?? "",
    fecha: formData.get("fecha") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos no válidos.",
    };
  }
  const d = parsed.data;

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("evaluaciones_eventuales").insert({
    sede_id: sede.id,
    estudiante_id: d.estudiante_id,
    asignatura_id: d.asignatura_id || null,
    titulo: d.titulo,
    descripcion: d.descripcion || null,
    nota: d.nota === "" || d.nota === undefined ? null : d.nota,
    fecha: d.fecha || undefined,
  });

  if (error) {
    if (error.code === "42501") {
      return { error: "Solo puedes registrar en tus estudiantes." };
    }
    return { error: "No se pudo guardar la evaluación." };
  }

  revalidatePath("/academico/eventuales");
  return { ok: true };
}
