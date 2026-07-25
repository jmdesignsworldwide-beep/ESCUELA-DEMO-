"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";

export interface ActionState {
  ok?: boolean;
  error?: string;
  nominaId?: string;
}

const crearSchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  tipo: z.enum(["ordinaria", "regalia"]),
});

/** Crea el período de nómina y genera sus líneas en un paso. */
export async function crearNominaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = crearSchema.safeParse({
    anio: formData.get("anio"),
    mes: formData.get("mes"),
    tipo: formData.get("tipo"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { data: nomina, error } = await supabase
    .from("nominas")
    .insert({
      sede_id: sede.id,
      anio: parsed.data.anio,
      mes: parsed.data.mes,
      tipo: parsed.data.tipo,
    })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !nomina) {
    return {
      error:
        error?.code === "23505"
          ? "Ya existe una nómina de ese período y tipo."
          : "No se pudo crear la nómina.",
    };
  }

  const { error: genErr } = await supabase.rpc("generar_nomina", {
    p_nomina: nomina.id,
  });
  if (genErr) return { error: "Nómina creada, pero falló el cálculo." };

  revalidatePath("/financiero/nomina");
  return { ok: true, nominaId: nomina.id };
}

const idSchema = z.object({ nomina_id: z.string().uuid() });

/** Recalcula una nómina en borrador desde los contratos activos. */
export async function recalcularNominaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = idSchema.safeParse({ nomina_id: formData.get("nomina_id") });
  if (!parsed.success) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.rpc("generar_nomina", {
    p_nomina: parsed.data.nomina_id,
  });
  if (error) return { error: "No se pudo recalcular la nómina." };

  revalidatePath("/financiero/nomina");
  return { ok: true, nominaId: parsed.data.nomina_id };
}

/** Cierra la nómina: pasa a inmutable. */
export async function cerrarNominaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = idSchema.safeParse({ nomina_id: formData.get("nomina_id") });
  if (!parsed.success) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.rpc("cerrar_nomina", {
    p_nomina: parsed.data.nomina_id,
  });
  if (error) return { error: "No se pudo cerrar la nómina." };

  revalidatePath("/financiero/nomina");
  return { ok: true, nominaId: parsed.data.nomina_id };
}

const configSchema = z.object({
  afp_pct: z.coerce.number().min(0).max(20),
  sfs_pct: z.coerce.number().min(0).max(20),
});

/** Ajuste rápido de porcentajes TSS del empleado. */
export async function configNominaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = configSchema.safeParse({
    afp_pct: formData.get("afp_pct"),
    sfs_pct: formData.get("sfs_pct"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase
    .from("config_nomina")
    .update({ afp_pct: parsed.data.afp_pct, sfs_pct: parsed.data.sfs_pct })
    .eq("sede_id", sede.id);
  if (error) return { error: "No se pudo actualizar la configuración." };

  revalidatePath("/financiero/nomina");
  return { ok: true };
}
