"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";

export interface PagoState {
  ok?: boolean;
  error?: string;
  recibo?: string;
  url?: string;
}

const pagoSchema = z.object({
  estudiante_id: z.string().uuid(),
  familia_id: z.string().uuid().optional().or(z.literal("")),
  metodo: z.enum(["efectivo", "transferencia", "tarjeta", "cheque"]),
  referencia: z.string().trim().max(80).optional().or(z.literal("")),
  aplicaciones: z
    .array(
      z.object({
        cargo_id: z.string().uuid(),
        monto: z.coerce.number().positive(),
      }),
    )
    .min(1, "Selecciona al menos un cargo."),
});

export async function registrarPagoAction(
  _prev: PagoState,
  formData: FormData,
): Promise<PagoState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const raw = formData.get("payload");
  let payload: unknown;
  try {
    payload = JSON.parse(typeof raw === "string" ? raw : "null");
  } catch {
    return { error: "Datos no válidos." };
  }
  const parsed = pagoSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.aplicaciones?.[0] ??
        "Datos no válidos.",
    };
  }

  const supabase = createClient();
  const { data: recibo, error } = await supabase.rpc("registrar_pago", {
    p_estudiante: parsed.data.estudiante_id,
    p_familia: parsed.data.familia_id || null,
    p_metodo: parsed.data.metodo,
    p_referencia: parsed.data.referencia || null,
    p_aplicaciones: parsed.data.aplicaciones,
  });
  if (error || typeof recibo !== "string") {
    return { error: "No se pudo registrar el pago." };
  }

  revalidatePath("/financiero/caja");
  return { ok: true, recibo, url: `/documentos/recibo/${recibo}` };
}

export interface SimpleState {
  ok?: boolean;
  error?: string;
}

export async function anularPagoAction(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const schema = z.object({
    pago_id: z.string().uuid(),
    motivo: z.string().trim().min(5, "Motivo obligatorio (mín. 5)."),
  });
  const parsed = schema.safeParse({
    pago_id: formData.get("pago_id"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.flatten().fieldErrors.motivo?.[0] ?? "Datos no válidos.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("anular_pago", {
    p_pago: parsed.data.pago_id,
    p_motivo: parsed.data.motivo,
  });
  if (error) return { error: "No se pudo anular el pago." };

  revalidatePath("/financiero/caja");
  return { ok: true };
}

export async function cerrarCajaAction(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const fecha = formData.get("fecha");
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { error: "Fecha no válida." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("cerrar_caja", { p_fecha: fecha });
  if (error) {
    return {
      error: error.code === "23505" ? "La caja de ese día ya está cerrada." : "No se pudo cerrar la caja.",
    };
  }

  revalidatePath("/financiero/caja");
  return { ok: true };
}
