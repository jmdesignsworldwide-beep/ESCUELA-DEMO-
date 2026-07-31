"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  estudiante_id: z.string().uuid().optional().or(z.literal("")),
  telefono: z.string().trim().min(7).max(30),
  categoria: z.enum([
    "general",
    "cobro",
    "circular",
    "asistencia",
    "calificaciones",
  ]),
  mensaje: z.string().trim().min(1).max(2000),
  plantilla_id: z.string().uuid().optional().or(z.literal("")),
});

/** Registra el envío de un mensaje de WhatsApp (enlace wa.me). */
export async function registrarEnvioWhatsappAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador", "secretaria", "contabilidad"], {
    redirectOnFail: false,
  });

  const parsed = schema.safeParse({
    estudiante_id: formData.get("estudiante_id") ?? "",
    telefono: formData.get("telefono"),
    categoria: formData.get("categoria"),
    mensaje: formData.get("mensaje"),
    plantilla_id: formData.get("plantilla_id") ?? "",
  });
  if (!parsed.success) return { error: "Datos no válidos." };
  const d = parsed.data;

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("envios_whatsapp").insert({
    sede_id: sede.id,
    estudiante_id: d.estudiante_id || null,
    telefono: d.telefono,
    categoria: d.categoria,
    mensaje: d.mensaje,
    plantilla_id: d.plantilla_id || null,
  });
  if (error) return { error: "No se pudo registrar el envío." };

  revalidatePath("/admin/whatsapp");
  return { ok: true };
}
