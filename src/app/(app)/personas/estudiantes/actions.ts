"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import {
  estudianteSchema,
  cambiarEstadoSchema,
} from "@/lib/validation/estudiante";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Genera el siguiente código de matrícula (EST-####). */
async function siguienteCodigo(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase
    .from("estudiantes")
    .select("codigo")
    .ilike("codigo", "EST-%")
    .order("codigo", { ascending: false })
    .limit(1)
    .maybeSingle<{ codigo: string }>();
  const last = data?.codigo?.match(/(\d+)$/)?.[1];
  const next = (last ? parseInt(last, 10) : 0) + 1;
  return `EST-${String(next).padStart(4, "0")}`;
}

/** Crear estudiante e inscribirlo en una sección del año activo. */
export async function crearEstudianteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "secretaria"], { redirectOnFail: false });

  const parsed = estudianteSchema.safeParse({
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    sexo: formData.get("sexo"),
    fecha_nacimiento: formData.get("fecha_nacimiento"),
    lugar_nacimiento: formData.get("lugar_nacimiento"),
    tipo_documento: formData.get("tipo_documento"),
    numero_documento: formData.get("numero_documento"),
    rne: formData.get("rne"),
    direccion: formData.get("direccion"),
    tipo_sangre: formData.get("tipo_sangre") ?? "",
    alergias: formData.get("alergias"),
    condiciones_medicas: formData.get("condiciones_medicas"),
    familia_id: formData.get("familia_id"),
    grado_id: formData.get("grado_id"),
    seccion_id: formData.get("seccion_id"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) return { error: "No hay sede o año escolar activo." };

  const supabase = createClient();
  const d = parsed.data;
  const codigo = await siguienteCodigo();

  const { data: est, error } = await supabase
    .from("estudiantes")
    .insert({
      sede_id: sede.id,
      familia_id: d.familia_id || null,
      codigo,
      rne: d.rne || null,
      nombres: d.nombres,
      apellidos: d.apellidos,
      sexo: d.sexo,
      fecha_nacimiento: d.fecha_nacimiento,
      lugar_nacimiento: d.lugar_nacimiento || null,
      tipo_documento: d.tipo_documento,
      numero_documento: d.numero_documento || null,
      direccion: d.direccion || null,
      tipo_sangre: d.tipo_sangre || null,
      alergias: d.alergias || null,
      condiciones_medicas: d.condiciones_medicas || null,
      estado: "activo",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !est) {
    return {
      error:
        error?.code === "23505"
          ? "Ya existe un estudiante con ese RNE o código."
          : "No se pudo crear el estudiante.",
    };
  }

  const { error: matError } = await supabase.from("matriculas").insert({
    estudiante_id: est.id,
    anio_id: anio.id,
    seccion_id: d.seccion_id,
    tipo: "inscripcion",
    estado: "activa",
  });

  if (matError) {
    return {
      error: "El estudiante se creó, pero no se pudo inscribir en la sección.",
    };
  }

  revalidatePath("/personas/estudiantes");
  return { ok: true };
}

/** Cambiar el estado de un estudiante (activo/retirado/egresado/transferido). */
export async function cambiarEstadoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "secretaria"], { redirectOnFail: false });

  const parsed = cambiarEstadoSchema.safeParse({
    estudiante_id: formData.get("estudiante_id"),
    estado: formData.get("estado"),
  });
  if (!parsed.success) {
    return { error: "Datos no válidos." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("estudiantes")
    .update({ estado: parsed.data.estado })
    .eq("id", parsed.data.estudiante_id);

  if (error) return { error: "No se pudo actualizar el estado." };

  revalidatePath("/personas/estudiantes");
  revalidatePath(`/personas/estudiantes/${parsed.data.estudiante_id}`);
  return { ok: true };
}
