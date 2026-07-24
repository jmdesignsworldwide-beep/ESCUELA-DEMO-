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

const payloadSchema = z.object({
  seccion_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  registros: z
    .array(
      z.object({
        estudiante_id: z.string().uuid(),
        estado: z.enum([
          "presente",
          "ausente",
          "tardanza",
          "excusa",
          "retiro_anticipado",
        ]),
      }),
    )
    .min(1)
    .max(80),
});

export async function guardarAsistenciaAction(
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
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return { error: "Datos no válidos." };

  const cerrar = formData.get("cerrar") === "1";

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();
  const { seccion_id, fecha, registros } = parsed.data;

  // Buscar o crear la sesión diaria (asignatura nula).
  const { data: existente } = await supabase
    .from("asistencia_sesiones")
    .select("id, cerrada")
    .eq("seccion_id", seccion_id)
    .eq("fecha", fecha)
    .is("asignatura_id", null)
    .maybeSingle<{ id: string; cerrada: boolean }>();

  if (existente?.cerrada) {
    return { error: "Este registro ya está cerrado y no puede modificarse." };
  }

  let sesionId = existente?.id;
  if (!sesionId) {
    const { data: nueva, error } = await supabase
      .from("asistencia_sesiones")
      .insert({ anio_id: anio.id, seccion_id, fecha, cerrada: false })
      .select("id")
      .single<{ id: string }>();
    if (error || !nueva) return { error: "No se pudo crear la sesión." };
    sesionId = nueva.id;
  }

  const { error: upsertError } = await supabase
    .from("asistencia_registros")
    .upsert(
      registros.map((r) => ({
        sesion_id: sesionId as string,
        estudiante_id: r.estudiante_id,
        estado: r.estado,
      })),
      { onConflict: "sesion_id,estudiante_id" },
    );
  if (upsertError) return { error: "No se pudieron guardar los registros." };

  if (cerrar) {
    const { error: cerrarError } = await supabase
      .from("asistencia_sesiones")
      .update({ cerrada: true, cerrada_at: new Date().toISOString() })
      .eq("id", sesionId);
    if (cerrarError) return { error: "No se pudo cerrar el registro." };
  }

  revalidatePath("/academico/asistencia");
  return { ok: true };
}
