"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const guardarSchema = z.object({
  seccion_id: z.string().uuid(),
  asignatura_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  notas: z
    .array(
      z.object({
        estudiante_id: z.string().uuid(),
        componente_id: z.string().uuid(),
        valor: z.coerce.number().min(0).max(100),
      }),
    )
    .max(2000),
});

/** Guardar/actualizar notas del libro (bloqueado si el período está cerrado). */
export async function guardarNotasAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador", "docente"], {
    redirectOnFail: false,
  });

  const raw = formData.get("payload");
  let payload: unknown;
  try {
    payload = JSON.parse(typeof raw === "string" ? raw : "null");
  } catch {
    return { error: "Datos no válidos." };
  }
  const parsed = guardarSchema.safeParse(payload);
  if (!parsed.success) return { error: "Revisa las notas (0–100)." };

  const { seccion_id, asignatura_id, periodo_id, notas } = parsed.data;
  const supabase = createClient();

  const { error } = await supabase.from("calificacion_componentes").upsert(
    notas.map((n) => ({
      seccion_id,
      asignatura_id,
      periodo_id,
      estudiante_id: n.estudiante_id,
      componente_id: n.componente_id,
      valor: n.valor,
    })),
    { onConflict: "seccion_id,asignatura_id,periodo_id,estudiante_id,componente_id" },
  );

  if (error) {
    if (error.code === "42501") {
      return {
        error: "Período cerrado: las calificaciones son inmutables.",
      };
    }
    return { error: "No se pudieron guardar las notas." };
  }

  revalidatePath("/academico/calificaciones");
  return { ok: true };
}

/** Cerrar el período (libro inmutable a partir de aquí). */
export async function cerrarPeriodoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const schema = z.object({
    seccion_id: z.string().uuid(),
    asignatura_id: z.string().uuid(),
    periodo_id: z.string().uuid(),
  });
  const parsed = schema.safeParse({
    seccion_id: formData.get("seccion_id"),
    asignatura_id: formData.get("asignatura_id"),
    periodo_id: formData.get("periodo_id"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.from("libro_cierres").upsert(
    {
      ...parsed.data,
      cerrado: true,
      cerrado_at: new Date().toISOString(),
    },
    { onConflict: "seccion_id,asignatura_id,periodo_id" },
  );
  if (error) return { error: "No se pudo cerrar el período." };

  revalidatePath("/academico/calificaciones");
  return { ok: true };
}

/** Corrección autorizada por el director (justificación → bitácora). */
export async function corregirAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director"], { redirectOnFail: false, strict: true });

  const schema = z.object({
    calificacion_id: z.string().uuid(),
    valor: z.coerce.number().min(0).max(100),
    justificacion: z.string().trim().min(5, "Justificación obligatoria (mín. 5)."),
  });
  const parsed = schema.safeParse({
    calificacion_id: formData.get("calificacion_id"),
    valor: formData.get("valor"),
    justificacion: formData.get("justificacion"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.justificacion?.[0] ??
        "Datos no válidos.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("corregir_calificacion", {
    p_calificacion: parsed.data.calificacion_id,
    p_valor: parsed.data.valor,
    p_justificacion: parsed.data.justificacion,
  });
  if (error) {
    return { error: error.message || "No se pudo aplicar la corrección." };
  }

  revalidatePath("/academico/calificaciones");
  return { ok: true };
}
