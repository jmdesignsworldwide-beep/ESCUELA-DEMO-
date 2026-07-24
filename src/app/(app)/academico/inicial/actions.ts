"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  seccion_id: z.string().uuid(),
  estudiante_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  observacion: z.string().trim().max(2000).optional().or(z.literal("")),
  evaluaciones: z
    .array(
      z.object({
        indicador_id: z.string().uuid(),
        valor: z.enum(["en_proceso", "logrado", "consolidado"]),
      }),
    )
    .max(200),
});

export async function guardarEvaluacionInicialAction(
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
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Datos no válidos." };

  const { seccion_id, estudiante_id, periodo_id, observacion, evaluaciones } =
    parsed.data;
  const supabase = createClient();

  if (evaluaciones.length > 0) {
    const { error } = await supabase.from("evaluaciones_inicial").upsert(
      evaluaciones.map((e) => ({
        seccion_id,
        estudiante_id,
        periodo_id,
        indicador_id: e.indicador_id,
        valor: e.valor,
      })),
      { onConflict: "estudiante_id,indicador_id,periodo_id" },
    );
    if (error) return { error: "No se pudieron guardar los indicadores." };
  }

  if (observacion && observacion.trim().length > 0) {
    const { error } = await supabase.from("observaciones_inicial").upsert(
      { seccion_id, estudiante_id, periodo_id, texto: observacion.trim() },
      { onConflict: "estudiante_id,periodo_id" },
    );
    if (error) return { error: "No se pudo guardar la observación." };
  }

  revalidatePath("/academico/inicial");
  return { ok: true };
}
