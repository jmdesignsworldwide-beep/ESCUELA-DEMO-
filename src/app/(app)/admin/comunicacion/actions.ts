"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";

const ROLES = ["director", "coordinador", "secretaria"] as const;

const crearSchema = z
  .object({
    titulo: z.string().trim().min(4, "Título muy corto.").max(140),
    cuerpo: z.string().trim().min(10, "El cuerpo es muy corto.").max(4000),
    tipo: z.enum(["circular", "aviso", "urgente"]),
    audiencia: z.enum(["todos", "nivel", "seccion", "morosos", "tutores"]),
    nivel_id: z.string().uuid().optional().or(z.literal("")),
    seccion_id: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((d) => d.audiencia !== "nivel" || !!d.nivel_id, {
    message: "Selecciona un nivel.",
    path: ["nivel_id"],
  })
  .refine((d) => d.audiencia !== "seccion" || !!d.seccion_id, {
    message: "Selecciona una sección.",
    path: ["seccion_id"],
  });

export async function crearCircularAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([...ROLES], { redirectOnFail: false });

  const parsed = crearSchema.safeParse({
    titulo: formData.get("titulo"),
    cuerpo: formData.get("cuerpo"),
    tipo: formData.get("tipo"),
    audiencia: formData.get("audiencia"),
    nivel_id: formData.get("nivel_id") ?? "",
    seccion_id: formData.get("seccion_id") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Revisa los campos." };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("circulares").insert({
    sede_id: sede.id,
    titulo: parsed.data.titulo,
    cuerpo: parsed.data.cuerpo,
    tipo: parsed.data.tipo,
    audiencia: parsed.data.audiencia,
    nivel_id: parsed.data.audiencia === "nivel" ? parsed.data.nivel_id || null : null,
    seccion_id:
      parsed.data.audiencia === "seccion" ? parsed.data.seccion_id || null : null,
  });
  if (error) return { error: "No se pudo crear la circular." };

  revalidatePath("/admin/comunicacion");
  return { ok: true };
}

export interface SimpleState {
  ok?: boolean;
  error?: string;
}

export async function publicarCircularAction(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireRole([...ROLES], { redirectOnFail: false });

  const id = formData.get("circular_id");
  if (typeof id !== "string" || !id) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.rpc("publicar_circular", { p_circular: id });
  if (error) return { error: "No se pudo publicar la circular." };

  revalidatePath("/admin/comunicacion");
  return { ok: true };
}
