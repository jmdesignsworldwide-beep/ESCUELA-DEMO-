"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require";
import { getAnioActivo } from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import { verificarFolio, type FolioVerificado } from "@/lib/docs/queries";

export interface VerificarState {
  checked?: boolean;
  resultado?: FolioVerificado | null;
  error?: string;
}

export async function verificarFolioAction(
  _prev: VerificarState,
  formData: FormData,
): Promise<VerificarState> {
  await requireRole(["director", "coordinador", "secretaria"], {
    redirectOnFail: false,
  });
  const folio = formData.get("folio");
  if (typeof folio !== "string" || folio.trim().length < 3) {
    return { error: "Ingresa un folio válido." };
  }
  const resultado = await verificarFolio(folio.trim());
  return { checked: true, resultado };
}

export interface EmitirState {
  ok?: boolean;
  error?: string;
  folio?: string;
  url?: string;
}

const TIPOS = [
  "boletin_periodo",
  "boletin_anual",
  "certificacion",
  "constancia_inscripcion",
  "record_notas",
  "buena_conducta",
  "carta_conclusion_primaria",
] as const;

const schema = z.object({
  tipo: z.enum(TIPOS),
  estudiante_id: z.string().uuid(),
  periodo_id: z.string().uuid().optional().or(z.literal("")),
});

export async function emitirDocumentoAction(
  _prev: EmitirState,
  formData: FormData,
): Promise<EmitirState> {
  await requireRole(["director", "coordinador", "secretaria"], {
    redirectOnFail: false,
  });

  const parsed = schema.safeParse({
    tipo: formData.get("tipo"),
    estudiante_id: formData.get("estudiante_id"),
    periodo_id: formData.get("periodo_id"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const supabase = createClient();
  const { data: folio, error } = await supabase.rpc("emitir_documento", {
    p_tipo: parsed.data.tipo,
    p_estudiante: parsed.data.estudiante_id,
    p_anio: anio.id,
    p_periodo: parsed.data.periodo_id || null,
  });

  if (error || typeof folio !== "string") {
    return { error: "No se pudo emitir el documento." };
  }

  return { ok: true, folio, url: `/documentos/${folio}` };
}

const masivaSchema = z.object({
  seccion_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
});

/** Emite un folio de lote para los boletines de una sección. */
export async function emitirMasivaAction(
  _prev: EmitirState,
  formData: FormData,
): Promise<EmitirState> {
  await requireRole(["director", "coordinador", "secretaria"], {
    redirectOnFail: false,
  });

  const parsed = masivaSchema.safeParse({
    seccion_id: formData.get("seccion_id"),
    periodo_id: formData.get("periodo_id"),
  });
  if (!parsed.success) return { error: "Datos no válidos." };

  const anio = await getAnioActivo();
  if (!anio) return { error: "No hay año escolar activo." };

  const roster = await getEstudiantesDeSeccion(parsed.data.seccion_id, anio.id);
  if (roster.length === 0) return { error: "La sección no tiene estudiantes." };

  const supabase = createClient();
  const { data: folio, error } = await supabase.rpc("emitir_documento", {
    p_tipo: "boletin_periodo",
    p_estudiante: roster[0]!.id,
    p_anio: anio.id,
    p_periodo: parsed.data.periodo_id,
  });
  if (error || typeof folio !== "string") {
    return { error: "No se pudo generar el lote." };
  }

  return {
    ok: true,
    folio,
    url: `/documentos/masivo/${parsed.data.seccion_id}?periodo=${parsed.data.periodo_id}&folio=${folio}`,
  };
}
