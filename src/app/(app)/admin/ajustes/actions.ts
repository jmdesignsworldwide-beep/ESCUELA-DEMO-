"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";

const schema = z.object({
  nombre: z.string().trim().min(3, "Nombre requerido.").max(140),
  siglas: z.string().trim().max(20).optional().or(z.literal("")),
  ciudad: z.string().trim().max(80).optional().or(z.literal("")),
  pais: z.string().trim().min(2).max(80),
  direccion: z.string().trim().max(200).optional().or(z.literal("")),
  telefono: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Correo no válido.").max(120).optional().or(z.literal("")),
  rnc: z.string().trim().max(30).optional().or(z.literal("")),
  director_nombre: z.string().trim().max(140).optional().or(z.literal("")),
  lema: z.string().trim().max(160).optional().or(z.literal("")),
});

export async function guardarConfigAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director"], { redirectOnFail: false });

  const parsed = schema.safeParse({
    nombre: formData.get("nombre"),
    siglas: formData.get("siglas") ?? "",
    ciudad: formData.get("ciudad") ?? "",
    pais: formData.get("pais") || "República Dominicana",
    direccion: formData.get("direccion") ?? "",
    telefono: formData.get("telefono") ?? "",
    email: formData.get("email") ?? "",
    rnc: formData.get("rnc") ?? "",
    director_nombre: formData.get("director_nombre") ?? "",
    lema: formData.get("lema") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Revisa los campos." };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const d = parsed.data;
  const supabase = createClient();
  const { error } = await supabase.from("config_institucional").upsert(
    {
      sede_id: sede.id,
      nombre: d.nombre,
      siglas: d.siglas || null,
      ciudad: d.ciudad || null,
      pais: d.pais,
      direccion: d.direccion || null,
      telefono: d.telefono || null,
      email: d.email || null,
      rnc: d.rnc || null,
      director_nombre: d.director_nombre || null,
      lema: d.lema || null,
    },
    { onConflict: "sede_id" },
  );
  if (error) return { error: "No se pudo guardar la configuración." };

  revalidatePath("/admin/ajustes");
  return { ok: true };
}
