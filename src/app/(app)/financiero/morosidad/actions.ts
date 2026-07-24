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
  bloqueo: z.enum(["on", "off"]),
  dias_gracia: z.coerce.number().int().min(0).max(120),
});

export async function configBloqueoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "contabilidad"], { redirectOnFail: false });

  const parsed = schema.safeParse({
    bloqueo: formData.get("bloqueo"),
    dias_gracia: formData.get("dias_gracia"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase
    .from("config_financiera")
    .update({
      bloqueo_por_morosidad: parsed.data.bloqueo === "on",
      dias_gracia: parsed.data.dias_gracia,
    })
    .eq("sede_id", sede.id);
  if (error) return { error: "No se pudo actualizar la configuración." };

  revalidatePath("/financiero/morosidad");
  return { ok: true };
}
