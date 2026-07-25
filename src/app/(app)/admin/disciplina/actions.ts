"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import { PUNTOS_SUGERIDOS } from "@/lib/discipline/types";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";

const schema = z
  .object({
    estudiante_id: z.string().uuid("Selecciona un estudiante."),
    categoria: z.enum(["merito", "demerito"]),
    gravedad: z.enum(["leve", "grave", "muy_grave"]).optional().or(z.literal("")),
    titulo: z.string().trim().min(4, "Título muy corto.").max(140),
    descripcion: z.string().trim().max(2000).optional().or(z.literal("")),
    medida: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => d.categoria !== "demerito" || !!d.gravedad, {
    message: "Indica la gravedad del demérito.",
    path: ["gravedad"],
  });

export async function crearIncidenciaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, email } = await requireRole(
    ["director", "coordinador", "docente"],
    { redirectOnFail: false },
  );

  const parsed = schema.safeParse({
    estudiante_id: formData.get("estudiante_id"),
    categoria: formData.get("categoria"),
    gravedad: formData.get("gravedad") ?? "",
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? "",
    medida: formData.get("medida") ?? "",
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "Revisa los campos.",
    };
  }

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede) return { error: "No hay sede activa." };

  const { categoria, gravedad } = parsed.data;
  const puntos =
    categoria === "merito"
      ? PUNTOS_SUGERIDOS.merito
      : (PUNTOS_SUGERIDOS[`demerito_${gravedad}`] ?? -2);

  const supabase = createClient();
  const { error } = await supabase.from("incidencias_disciplina").insert({
    sede_id: sede.id,
    estudiante_id: parsed.data.estudiante_id,
    anio_id: anio?.id ?? null,
    categoria,
    gravedad: categoria === "demerito" ? gravedad || null : null,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion || null,
    medida: parsed.data.medida || null,
    puntos,
    reportado_por: userId,
    reportado_email: email,
  });
  if (error) return { error: "No se pudo registrar la incidencia." };

  revalidatePath("/admin/disciplina");
  return { ok: true };
}
