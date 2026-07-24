import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DocumentoEmitido, NotaBoletin } from "@/lib/docs/types";

export async function getDocumentoPorFolio(
  folio: string,
): Promise<DocumentoEmitido | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("documentos_emitidos")
    .select("*")
    .eq("folio", folio)
    .maybeSingle<DocumentoEmitido>();
  return data ?? null;
}

export async function getBoletinNumerico(
  estudianteId: string,
  anioId: string,
): Promise<NotaBoletin[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("boletin_numerico", {
    p_estudiante: estudianteId,
    p_anio: anioId,
  });
  return ((data as { asignatura_id: string; periodo_orden: number; nota: number }[]) ??
    []).map((r) => ({
    asignatura_id: r.asignatura_id,
    periodo_orden: r.periodo_orden,
    nota: Number(r.nota),
  }));
}

export interface FolioVerificado {
  folio: string;
  tipo: string;
  emitido: string;
  valido: boolean;
}

export async function verificarFolio(
  folio: string,
): Promise<FolioVerificado | null> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("verificar_folio", { p_folio: folio })
    .maybeSingle<FolioVerificado>();
  return data ?? null;
}

/** Documentos recientes emitidos (para el panel). */
export async function getDocumentosRecientes(
  limit = 20,
): Promise<DocumentoEmitido[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("documentos_emitidos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as DocumentoEmitido[]) ?? [];
}
