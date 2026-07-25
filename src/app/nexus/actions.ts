"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/require";
import { esSuperAdmin } from "@/lib/nexus/queries";

export interface NexusState {
  ok?: boolean;
  error?: string;
}

async function ensureSuper(): Promise<boolean> {
  await requireActiveUser({ redirectOnFail: false });
  return esSuperAdmin();
}

const crearSchema = z.object({
  etiqueta: z.string().trim().min(2, "Etiqueta requerida.").max(120),
  email: z.string().trim().email("Correo no válido.").max(120),
  password: z.string().min(6, "Mínimo 6 caracteres.").max(72),
  // "" (personalizado sin valor) o número; vacío + sin_vencimiento controla null
  dias: z.coerce.number().int().min(1).max(3650).optional(),
  sin_vencimiento: z.enum(["si", "no"]).default("no"),
});

export async function crearAccesoAction(
  _prev: NexusState,
  formData: FormData,
): Promise<NexusState> {
  if (!(await ensureSuper())) return { error: "No autorizado." };

  const parsed = crearSchema.safeParse({
    etiqueta: formData.get("etiqueta"),
    email: formData.get("email"),
    password: formData.get("password"),
    dias: formData.get("dias") || undefined,
    sin_vencimiento: formData.get("sin_vencimiento") || "no",
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      error:
        f.email?.[0] ?? f.password?.[0] ?? f.etiqueta?.[0] ?? f.dias?.[0] ??
        "Revisa los campos.",
    };
  }

  const dias =
    parsed.data.sin_vencimiento === "si" ? null : parsed.data.dias ?? 15;

  const supabase = createClient();
  const { error } = await supabase.rpc("nexus_crear_acceso", {
    p_email: parsed.data.email,
    p_password: parsed.data.password,
    p_etiqueta: parsed.data.etiqueta,
    p_dias: dias,
  });
  // No se registra ni la contraseña ni el correo en logs.
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe una cuenta con ese correo."
          : "No se pudo crear el acceso.",
    };
  }

  revalidatePath("/nexus");
  return { ok: true };
}

const renovarSchema = z.object({
  id: z.string().uuid(),
  dias: z.coerce.number().int().min(1).max(3650).optional(),
  sin_vencimiento: z.enum(["si", "no"]).default("no"),
});

export async function renovarAccesoAction(
  _prev: NexusState,
  formData: FormData,
): Promise<NexusState> {
  if (!(await ensureSuper())) return { error: "No autorizado." };

  const parsed = renovarSchema.safeParse({
    id: formData.get("id"),
    dias: formData.get("dias") || undefined,
    sin_vencimiento: formData.get("sin_vencimiento") || "no",
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const dias =
    parsed.data.sin_vencimiento === "si" ? null : parsed.data.dias ?? 15;

  const supabase = createClient();
  const { error } = await supabase.rpc("nexus_renovar", {
    p_id: parsed.data.id,
    p_dias: dias,
  });
  if (error) return { error: "No se pudo renovar el acceso." };

  revalidatePath("/nexus");
  return { ok: true };
}

export async function revocarAccesoAction(
  _prev: NexusState,
  formData: FormData,
): Promise<NexusState> {
  if (!(await ensureSuper())) return { error: "No autorizado." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.rpc("nexus_revocar", { p_id: id });
  if (error) return { error: "No se pudo revocar el acceso." };

  revalidatePath("/nexus");
  return { ok: true };
}

export async function resembrarDemoAction(
  _prev: NexusState,
  _formData: FormData,
): Promise<NexusState> {
  if (!(await ensureSuper())) return { error: "No autorizado." };

  const supabase = createClient();
  const { error } = await supabase.rpc("nexus_resembrar_demo");
  if (error) return { error: "No se pudo resembrar el demo." };

  revalidatePath("/nexus");
  return { ok: true };
}
