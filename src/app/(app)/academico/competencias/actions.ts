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
        tipo: z.enum(["fundamental", "especifica"]),
        competencia_id: z.string().uuid(),
        valor: z.coerce.number().min(0).max(100),
      }),
    )
    .max(5000),
});

/** Guardar/actualizar el libro por competencia (bloqueado si el período está cerrado). */
export async function guardarCompetenciasAction(
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

  const fundamentales = notas
    .filter((n) => n.tipo === "fundamental")
    .map((n) => ({
      seccion_id,
      asignatura_id,
      periodo_id,
      estudiante_id: n.estudiante_id,
      fundamental_id: n.competencia_id,
      especifica_id: null,
      valor: n.valor,
    }));
  const especificas = notas
    .filter((n) => n.tipo === "especifica")
    .map((n) => ({
      seccion_id,
      asignatura_id,
      periodo_id,
      estudiante_id: n.estudiante_id,
      fundamental_id: null,
      especifica_id: n.competencia_id,
      valor: n.valor,
    }));

  if (fundamentales.length > 0) {
    const { error } = await supabase
      .from("calificacion_competencias")
      .upsert(fundamentales, {
        onConflict:
          "seccion_id,asignatura_id,periodo_id,estudiante_id,fundamental_id",
      });
    if (error) return errorFrom(error);
  }
  if (especificas.length > 0) {
    const { error } = await supabase
      .from("calificacion_competencias")
      .upsert(especificas, {
        onConflict:
          "seccion_id,asignatura_id,periodo_id,estudiante_id,especifica_id",
      });
    if (error) return errorFrom(error);
  }

  revalidatePath("/academico/competencias");
  return { ok: true };
}

function errorFrom(error: { code?: string }): ActionState {
  if (error.code === "42501") {
    return { error: "Período cerrado: las competencias son inmutables." };
  }
  return { error: "No se pudieron guardar las competencias." };
}

/** Cerrar el libro por competencia (reusa public.libro_cierres). */
export async function cerrarCompetenciasAction(
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

  revalidatePath("/academico/competencias");
  return { ok: true };
}

/** Corrección autorizada por el director (justificación → bitácora). */
export async function corregirCompetenciaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director"], { redirectOnFail: false, strict: true });

  const schema = z.object({
    calificacion_id: z.string().uuid(),
    valor: z.coerce.number().min(0).max(100),
    justificacion: z
      .string()
      .trim()
      .min(5, "Justificación obligatoria (mín. 5)."),
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
  const { error } = await supabase.rpc("corregir_competencia", {
    p_calificacion: parsed.data.calificacion_id,
    p_valor: parsed.data.valor,
    p_justificacion: parsed.data.justificacion,
  });
  if (error) {
    return { error: error.message || "No se pudo aplicar la corrección." };
  }

  revalidatePath("/academico/competencias");
  return { ok: true };
}
