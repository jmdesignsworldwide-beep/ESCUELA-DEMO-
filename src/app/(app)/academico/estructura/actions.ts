"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import {
  aulaSchema,
  asignaturaSchema,
  seccionSchema,
  ponderacionSchema,
} from "@/lib/validation/academico";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const ESTRUCTURA = "/academico/estructura";

/** Crear aula. Solo dirección/coordinación. */
export async function crearAulaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const parsed = aulaSchema.safeParse({
    nombre: formData.get("nombre"),
    codigo: formData.get("codigo"),
    capacidad: formData.get("capacidad"),
    ubicacion: formData.get("ubicacion"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("aulas").insert({
    sede_id: sede.id,
    nombre: parsed.data.nombre,
    codigo: parsed.data.codigo.toUpperCase(),
    capacidad: parsed.data.capacidad,
    ubicacion: parsed.data.ubicacion || null,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un aula con ese código."
          : "No se pudo crear el aula.",
    };
  }

  revalidatePath(ESTRUCTURA);
  return { ok: true };
}

/** Crear asignatura. */
export async function crearAsignaturaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const parsed = asignaturaSchema.safeParse({
    nombre: formData.get("nombre"),
    codigo: formData.get("codigo"),
    area: formData.get("area"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("asignaturas").insert({
    sede_id: sede.id,
    nombre: parsed.data.nombre,
    codigo: parsed.data.codigo.toUpperCase(),
    area: parsed.data.area || null,
    es_base: false,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe una asignatura con ese código."
          : "No se pudo crear la asignatura.",
    };
  }

  revalidatePath(ESTRUCTURA);
  return { ok: true };
}

/** Crear sección para el año activo. */
export async function crearSeccionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const parsed = seccionSchema.safeParse({
    grado_id: formData.get("grado_id"),
    jornada_id: formData.get("jornada_id"),
    aula_id: formData.get("aula_id"),
    nombre: formData.get("nombre"),
    modalidad: formData.get("modalidad"),
    cupo: formData.get("cupo"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();
  const { error } = await supabase.from("secciones").insert({
    anio_id: anio.id,
    grado_id: parsed.data.grado_id,
    jornada_id: parsed.data.jornada_id,
    aula_id: parsed.data.aula_id || null,
    nombre: parsed.data.nombre.toUpperCase(),
    modalidad: parsed.data.modalidad || null,
    cupo: parsed.data.cupo,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe una sección con ese grado, nombre y jornada."
          : "No se pudo crear la sección.",
    };
  }

  revalidatePath(ESTRUCTURA);
  return { ok: true };
}

/**
 * Guardar la ponderación de un esquema: reemplaza sus componentes.
 * La suma 100% se valida en Zod y además a nivel de BD (constraint diferida).
 */
export async function guardarPonderacionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const raw = formData.get("payload");
  let payload: unknown;
  try {
    payload = JSON.parse(typeof raw === "string" ? raw : "null");
  } catch {
    return { error: "Datos no válidos." };
  }

  const parsed = ponderacionSchema.safeParse(payload);
  if (!parsed.success) {
    const fe = parsed.error.flatten();
    return {
      error:
        fe.formErrors[0] ??
        fe.fieldErrors.componentes?.[0] ??
        "Revisa los componentes.",
    };
  }

  const supabase = createClient();

  // Reemplazo transaccional vía RPC para respetar la constraint diferida.
  const { error } = await supabase.rpc("reemplazar_ponderacion", {
    p_esquema: parsed.data.esquema_id,
    p_componentes: parsed.data.componentes,
  });

  if (error) {
    return {
      error: error.message.includes("sumar")
        ? "Los pesos deben sumar exactamente 100%."
        : "No se pudo guardar la ponderación.",
    };
  }

  revalidatePath(ESTRUCTURA);
  return { ok: true };
}
