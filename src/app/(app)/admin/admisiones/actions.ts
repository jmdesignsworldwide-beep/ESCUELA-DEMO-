"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import {
  getEventosSolicitud,
  type AdmisionEvento,
} from "@/lib/admisiones/queries";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const STAFF = ["director", "coordinador", "secretaria"] as const;

const estadoSchema = z.object({
  solicitud_id: z.string().uuid(),
  estado: z.enum([
    "recibida",
    "en_revision",
    "entrevista",
    "aceptada",
    "lista_espera",
    "rechazada",
  ]),
  nota: z.string().trim().max(1000).optional().or(z.literal("")),
  entrevista: z.string().trim().max(40).optional().or(z.literal("")),
});

/** Cambia el estado de una solicitud y registra el evento (bitácora). */
export async function cambiarEstadoSolicitudAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([...STAFF], { redirectOnFail: false });

  const parsed = estadoSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    estado: formData.get("estado"),
    nota: formData.get("nota") ?? "",
    entrevista: formData.get("entrevista") ?? "",
  });
  if (!parsed.success) return { error: "Datos no válidos." };
  const d = parsed.data;

  let entrevistaIso: string | null = null;
  if (d.estado === "entrevista" && d.entrevista) {
    const dt = new Date(d.entrevista);
    if (!Number.isNaN(dt.getTime())) entrevistaIso = dt.toISOString();
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("cambiar_estado_solicitud", {
    p_solicitud: d.solicitud_id,
    p_estado: d.estado,
    p_nota: d.nota || null,
    p_entrevista: entrevistaIso,
  });
  if (error) return { error: "No se pudo actualizar la solicitud." };

  revalidatePath("/admin/admisiones");
  return { ok: true };
}

const matricularSchema = z.object({
  solicitud_id: z.string().uuid(),
  seccion_id: z.string().uuid(),
});

/** Matricula un aspirante aceptado: crea estudiante + tutor + matrícula. */
export async function matricularAspiranteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "secretaria"], { redirectOnFail: false });

  const parsed = matricularSchema.safeParse({
    solicitud_id: formData.get("solicitud_id"),
    seccion_id: formData.get("seccion_id"),
  });
  if (!parsed.success) return { error: "Selecciona una sección válida." };

  const supabase = createClient();
  const { error } = await supabase.rpc("matricular_aspirante", {
    p_solicitud: parsed.data.solicitud_id,
    p_seccion: parsed.data.seccion_id,
  });
  if (error) {
    return {
      error:
        "No se pudo matricular. Verifica que la solicitud esté aceptada y la sección sea válida.",
    };
  }

  revalidatePath("/admin/admisiones");
  return { ok: true };
}

/** Devuelve la bitácora de eventos de una solicitud (para el detalle). */
export async function eventosSolicitudAction(
  solicitudId: string,
): Promise<AdmisionEvento[]> {
  await requireRole([...STAFF], { redirectOnFail: false });
  if (!/^[0-9a-f-]{36}$/i.test(solicitudId)) return [];
  return getEventosSolicitud(solicitudId);
}
