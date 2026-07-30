"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";

export interface NormasState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  asistencia_minima: z.coerce.number().min(0).max(100),
  niveles: z.array(
    z.object({
      id: z.string().uuid(),
      // "" = sin umbral (Inicial cualitativa); número = umbral de aprobación.
      min_aprobacion: z
        .union([z.coerce.number().min(0).max(100), z.literal("")])
        .optional(),
    }),
  ),
});

export async function guardarNormasAction(
  _prev: NormasState,
  formData: FormData,
): Promise<NormasState> {
  await requireRole(["director"], { redirectOnFail: false });

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    return { error: "Datos no válidos." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Revisa los valores (0–100)." };

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();

  const { error: cErr } = await supabase
    .from("config_academica")
    .update({ asistencia_minima: parsed.data.asistencia_minima })
    .eq("sede_id", sede.id);
  if (cErr) return { error: "No se pudo guardar la regla de asistencia." };

  for (const n of parsed.data.niveles) {
    const min =
      n.min_aprobacion === "" || n.min_aprobacion === undefined
        ? null
        : n.min_aprobacion;
    const { error } = await supabase
      .from("niveles")
      .update({ min_aprobacion: min })
      .eq("id", n.id)
      .eq("sede_id", sede.id);
    if (error) return { error: "No se pudo guardar la nota de aprobación." };
  }

  revalidatePath("/admin/ajustes");
  return { ok: true };
}

export async function toggleRepitenciaAction(
  _prev: NormasState,
  formData: FormData,
): Promise<NormasState> {
  await requireRole(["director"], { redirectOnFail: false });

  const grado = formData.get("grado_id");
  const permite = formData.get("permite") === "on";
  if (typeof grado !== "string" || !grado) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase
    .from("grados")
    .update({ permite_repitencia: permite })
    .eq("id", grado);
  if (error) return { error: "No se pudo actualizar la repitencia." };

  revalidatePath("/admin/ajustes");
  return { ok: true };
}
