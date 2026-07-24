"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getAnioActivo } from "@/lib/academic/queries";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  estudiante_id: z.string().uuid(),
  asignatura_id: z.string().uuid(),
  seccion_id: z.string().uuid(),
  instancia: z.enum(["completivo", "extraordinario", "especial"]),
  nota: z.coerce.number().min(0, "Mínimo 0.").max(70, "Máximo 70 (tope de recuperación)."),
});

export async function guardarRecuperacionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const parsed = schema.safeParse({
    estudiante_id: formData.get("estudiante_id"),
    asignatura_id: formData.get("asignatura_id"),
    seccion_id: formData.get("seccion_id"),
    instancia: formData.get("instancia"),
    nota: formData.get("nota"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.nota?.[0] ?? "Datos no válidos.",
    };
  }

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();
  const { error } = await supabase.from("recuperaciones").upsert(
    {
      estudiante_id: parsed.data.estudiante_id,
      asignatura_id: parsed.data.asignatura_id,
      anio_id: anio.id,
      seccion_id: parsed.data.seccion_id,
      instancia: parsed.data.instancia,
      nota: parsed.data.nota,
    },
    { onConflict: "estudiante_id,asignatura_id,anio_id,instancia" },
  );

  if (error) {
    if (error.code === "23514") {
      return { error: "La nota de recuperación no puede superar 70." };
    }
    return { error: "No se pudo guardar la recuperación." };
  }

  revalidatePath("/academico/recuperacion");
  return { ok: true };
}
