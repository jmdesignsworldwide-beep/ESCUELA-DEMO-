"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getAnioActivo } from "@/lib/academic/queries";

export interface ActionState {
  ok?: boolean;
  error?: string;
  mensaje?: string;
}

/** Generación masiva de la mensualidad de un mes (descuentos automáticos). */
export async function generarMensualidadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const mes = z.coerce.number().int().min(1).max(12).safeParse(formData.get("mes"));
  if (!mes.success) return { error: "Mes no válido." };

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("generar_cargos_mensualidad", {
    p_anio: anio.id,
    p_mes: mes.data,
  });
  if (error) return { error: "No se pudieron generar los cargos." };

  revalidatePath("/financiero/facturacion");
  return {
    ok: true,
    mensaje: `${data ?? 0} cargos generados para el mes ${mes.data}.`,
  };
}

const becaSchema = z.object({
  estudiante_id: z.string().uuid(),
  tipo: z.enum(["completa", "media", "porcentaje"]),
  porcentaje: z.coerce.number().min(0).max(100),
  motivo: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function crearBecaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = becaSchema.safeParse({
    estudiante_id: formData.get("estudiante_id"),
    tipo: formData.get("tipo"),
    porcentaje: formData.get("porcentaje"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const pct =
    parsed.data.tipo === "completa"
      ? 100
      : parsed.data.tipo === "media"
        ? 50
        : parsed.data.porcentaje;

  const supabase = createClient();
  const { error } = await supabase.from("becas").upsert(
    {
      estudiante_id: parsed.data.estudiante_id,
      tipo: parsed.data.tipo,
      porcentaje: pct,
      motivo: parsed.data.motivo || null,
      activa: true,
    },
    { onConflict: "estudiante_id" },
  );
  if (error) return { error: "No se pudo registrar la beca." };

  revalidatePath("/financiero/facturacion");
  return { ok: true };
}

const conceptoSchema = z.object({
  concepto_id: z.string().uuid(),
  monto: z.coerce.number().min(0).max(1000000),
});

export async function actualizarConceptoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = conceptoSchema.safeParse({
    concepto_id: formData.get("concepto_id"),
    monto: formData.get("monto"),
  });
  if (!parsed.success) return { error: "Monto no válido." };

  const supabase = createClient();
  const { error } = await supabase
    .from("conceptos_cobro")
    .update({ monto: parsed.data.monto })
    .eq("id", parsed.data.concepto_id);
  if (error) return { error: "No se pudo actualizar el concepto." };

  revalidatePath("/financiero/facturacion");
  return { ok: true };
}
