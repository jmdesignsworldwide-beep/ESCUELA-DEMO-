"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import {
  empleadoSchema,
  editarEmpleadoSchema,
  asignacionSchema,
  estadoEmpleadoSchema,
} from "@/lib/validation/empleado";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const PREFIJO: Record<string, string> = {
  docente: "DOC",
  administrativo: "ADM",
  apoyo: "APY",
  directivo: "DIR",
};

async function siguienteCodigo(tipo: string): Promise<string> {
  const supabase = createClient();
  const pre = PREFIJO[tipo] ?? "EMP";
  const { data } = await supabase
    .from("empleados")
    .select("codigo")
    .ilike("codigo", `${pre}-%`)
    .order("codigo", { ascending: false })
    .limit(1)
    .maybeSingle<{ codigo: string }>();
  const last = data?.codigo?.match(/(\d+)$/)?.[1];
  const next = (last ? parseInt(last, 10) : 0) + 1;
  return `${pre}-${String(next).padStart(3, "0")}`;
}

export async function crearEmpleadoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "secretaria"], { redirectOnFail: false });

  const parsed = empleadoSchema.safeParse({
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    cedula: formData.get("cedula"),
    tipo: formData.get("tipo"),
    cargo: formData.get("cargo"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    direccion: formData.get("direccion"),
    fecha_ingreso: formData.get("fecha_ingreso"),
    titulo_academico: formData.get("titulo_academico"),
    fecha_nacimiento: formData.get("fecha_nacimiento"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const d = parsed.data;
  const codigo = await siguienteCodigo(d.tipo);

  const { error } = await supabase.from("empleados").insert({
    sede_id: sede.id,
    codigo,
    nombres: d.nombres,
    apellidos: d.apellidos,
    cedula: d.cedula || null,
    tipo: d.tipo,
    cargo: d.cargo,
    telefono: d.telefono || null,
    email: d.email || null,
    direccion: d.direccion || null,
    fecha_ingreso: d.fecha_ingreso || null,
    titulo_academico: d.titulo_academico || null,
    fecha_nacimiento: d.fecha_nacimiento || null,
    estado: "activo",
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya existe un empleado con ese código."
          : "No se pudo crear el empleado.",
    };
  }

  revalidatePath("/personas/docentes");
  return { ok: true };
}

/** Editar los datos de un empleado (CRUD completo). */
export async function editarEmpleadoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "secretaria"], { redirectOnFail: false });

  const parsed = editarEmpleadoSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    cedula: formData.get("cedula"),
    tipo: formData.get("tipo"),
    cargo: formData.get("cargo"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    direccion: formData.get("direccion"),
    fecha_ingreso: formData.get("fecha_ingreso"),
    titulo_academico: formData.get("titulo_academico"),
    fecha_nacimiento: formData.get("fecha_nacimiento"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const supabase = createClient();
  const { error } = await supabase
    .from("empleados")
    .update({
      nombres: d.nombres,
      apellidos: d.apellidos,
      cedula: d.cedula || null,
      tipo: d.tipo,
      cargo: d.cargo,
      telefono: d.telefono || null,
      email: d.email || null,
      direccion: d.direccion || null,
      fecha_ingreso: d.fecha_ingreso || null,
      titulo_academico: d.titulo_academico || null,
      fecha_nacimiento: d.fecha_nacimiento || null,
    })
    .eq("id", d.empleado_id);

  if (error) return { error: "No se pudieron guardar los cambios." };

  revalidatePath("/personas/docentes");
  revalidatePath(`/personas/docentes/${d.empleado_id}`);
  return { ok: true };
}

/** Asignar una sección + asignatura a un docente. */
export async function asignarSeccionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const parsed = asignacionSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    seccion_id: formData.get("seccion_id"),
    asignatura_id: formData.get("asignatura_id"),
    horas_semanales: formData.get("horas_semanales"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();
  const { error } = await supabase.from("docente_secciones").insert({
    empleado_id: parsed.data.empleado_id,
    seccion_id: parsed.data.seccion_id,
    asignatura_id: parsed.data.asignatura_id,
    anio_id: anio.id,
    horas_semanales: parsed.data.horas_semanales,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Esa sección y asignatura ya están asignadas a este docente."
          : "No se pudo crear la asignación.",
    };
  }

  revalidatePath(`/personas/docentes/${parsed.data.empleado_id}`);
  return { ok: true };
}

export async function quitarAsignacionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "coordinador"], { redirectOnFail: false });

  const id = formData.get("id");
  const empleadoId = formData.get("empleado_id");
  if (typeof id !== "string") return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase
    .from("docente_secciones")
    .delete()
    .eq("id", id);

  if (error) return { error: "No se pudo quitar la asignación." };

  if (typeof empleadoId === "string") {
    revalidatePath(`/personas/docentes/${empleadoId}`);
  }
  return { ok: true };
}

export async function cambiarEstadoEmpleadoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["director", "secretaria"], { redirectOnFail: false });

  const parsed = estadoEmpleadoSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    estado: formData.get("estado"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase
    .from("empleados")
    .update({ estado: parsed.data.estado })
    .eq("id", parsed.data.empleado_id);

  if (error) return { error: "No se pudo actualizar el estado." };

  revalidatePath("/personas/docentes");
  revalidatePath(`/personas/docentes/${parsed.data.empleado_id}`);
  return { ok: true };
}
