"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getSedeActiva } from "@/lib/academic/queries";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";

const ROLES = ["director", "secretaria"] as const;

// ── Inventario ────────────────────────────────────────────────────────
const itemSchema = z.object({
  codigo: z.string().trim().min(1, "Código requerido.").max(40),
  nombre: z.string().trim().min(2, "Nombre requerido.").max(140),
  categoria: z.enum(["mobiliario", "equipo", "tecnologia", "insumo", "otro"]),
  cantidad: z.coerce.number().int().min(0).max(1_000_000),
  unidad: z.string().trim().min(1).max(20),
  ubicacion: z.string().trim().max(80).optional().or(z.literal("")),
  estado: z.enum(["bueno", "regular", "malo", "baja"]),
  valor_unitario: z.coerce.number().min(0).max(100_000_000),
});

export async function crearItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([...ROLES], { redirectOnFail: false });

  const parsed = itemSchema.safeParse({
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria"),
    cantidad: formData.get("cantidad"),
    unidad: formData.get("unidad") || "unidad",
    ubicacion: formData.get("ubicacion") ?? "",
    estado: formData.get("estado"),
    valor_unitario: formData.get("valor_unitario") || 0,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Revisa los campos." };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("inventario_items").insert({
    sede_id: sede.id,
    codigo: parsed.data.codigo,
    nombre: parsed.data.nombre,
    categoria: parsed.data.categoria,
    cantidad: parsed.data.cantidad,
    unidad: parsed.data.unidad,
    ubicacion: parsed.data.ubicacion || null,
    estado: parsed.data.estado,
    valor_unitario: parsed.data.valor_unitario,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "Ya existe un item con ese código." : "No se pudo guardar.",
    };
  }

  revalidatePath("/admin/inventario");
  return { ok: true };
}

// ── Biblioteca: libro ─────────────────────────────────────────────────
const libroSchema = z.object({
  titulo: z.string().trim().min(2, "Título requerido.").max(200),
  autor: z.string().trim().max(140).optional().or(z.literal("")),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  isbn: z.string().trim().max(30).optional().or(z.literal("")),
  ejemplares_total: z.coerce.number().int().min(0).max(100000),
});

export async function crearLibroAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole([...ROLES], { redirectOnFail: false });

  const parsed = libroSchema.safeParse({
    titulo: formData.get("titulo"),
    autor: formData.get("autor") ?? "",
    categoria: formData.get("categoria") ?? "",
    isbn: formData.get("isbn") ?? "",
    ejemplares_total: formData.get("ejemplares_total") || 1,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Revisa los campos." };
  }

  const sede = await getSedeActiva();
  if (!sede) return { error: "No hay sede activa." };

  const supabase = createClient();
  const { error } = await supabase.from("libros").insert({
    sede_id: sede.id,
    titulo: parsed.data.titulo,
    autor: parsed.data.autor || null,
    categoria: parsed.data.categoria || null,
    isbn: parsed.data.isbn || null,
    ejemplares_total: parsed.data.ejemplares_total,
  });
  if (error) return { error: "No se pudo guardar el libro." };

  revalidatePath("/admin/inventario");
  return { ok: true };
}

// ── Biblioteca: préstamo / devolución ─────────────────────────────────
export interface SimpleState {
  ok?: boolean;
  error?: string;
}

const prestamoSchema = z.object({
  libro_id: z.string().uuid(),
  prestatario: z.string().trim().min(2, "Indica a quién se presta.").max(140),
  estudiante_id: z.string().uuid().optional().or(z.literal("")),
  vence: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.").optional().or(z.literal("")),
});

export async function prestarAction(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireRole([...ROLES], { redirectOnFail: false });

  const parsed = prestamoSchema.safeParse({
    libro_id: formData.get("libro_id"),
    prestatario: formData.get("prestatario"),
    estudiante_id: formData.get("estudiante_id") ?? "",
    vence: formData.get("vence") ?? "",
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.rpc("registrar_prestamo", {
    p_libro: parsed.data.libro_id,
    p_prestatario: parsed.data.prestatario,
    p_estudiante: parsed.data.estudiante_id || null,
    p_vence: parsed.data.vence || null,
  });
  if (error) {
    return {
      error:
        error.code === "23514" || error.message?.includes("disponibles")
          ? "No hay ejemplares disponibles de este libro."
          : "No se pudo registrar el préstamo.",
    };
  }

  revalidatePath("/admin/inventario");
  return { ok: true };
}

export async function devolverAction(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireRole([...ROLES], { redirectOnFail: false });

  const id = formData.get("prestamo_id");
  if (typeof id !== "string" || !id) return { error: "Datos no válidos." };

  const supabase = createClient();
  const { error } = await supabase.rpc("registrar_devolucion", { p_prestamo: id });
  if (error) return { error: "No se pudo registrar la devolución." };

  revalidatePath("/admin/inventario");
  return { ok: true };
}
