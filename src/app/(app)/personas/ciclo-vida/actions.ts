"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const convalidacionSchema = z.object({
  estudiante_id: z.string().uuid(),
  colegio_origen: z.string().trim().min(3, "Indica el colegio de origen."),
  anio_origen: z.string().trim().max(20).optional(),
  grado: z.string().trim().max(60).optional(),
  materias: z
    .array(
      z.object({
        asignatura: z.string().trim().min(2),
        nota: z.coerce.number().min(0).max(100),
      }),
    )
    .min(1, "Agrega al menos una asignatura.")
    .max(30),
});

/**
 * Registra una transferencia entrante: convalida las notas del colegio de
 * origen y deja constancia del movimiento (transferencia_entrante).
 */
export async function registrarTransferenciaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador", "secretaria"], {
    redirectOnFail: false,
  });

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    return { error: "Datos no válidos." };
  }
  const parsed = convalidacionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Revisa los datos de convalidación.",
    };
  }
  const d = parsed.data;
  const supabase = createClient();

  const { error: cErr } = await supabase.from("convalidaciones").insert(
    d.materias.map((m) => ({
      estudiante_id: d.estudiante_id,
      colegio_origen: d.colegio_origen,
      anio_origen: d.anio_origen || null,
      grado: d.grado || null,
      asignatura: m.asignatura,
      nota: m.nota,
    })),
  );
  if (cErr) return { error: "No se pudieron guardar las convalidaciones." };

  const { error: mErr } = await supabase
    .from("estudiante_movimientos")
    .insert({
      estudiante_id: d.estudiante_id,
      tipo: "transferencia_entrante",
      estado_nuevo: "activo",
      motivo: `Transferencia entrante de ${d.colegio_origen}. ${d.materias.length} asignatura(s) convalidada(s).`,
    });
  if (mErr) return { error: "No se pudo registrar el movimiento." };

  revalidatePath("/personas/ciclo-vida");
  revalidatePath(`/personas/estudiantes/${d.estudiante_id}`);
  return { ok: true };
}
