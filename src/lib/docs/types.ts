/** Tipos de documentos oficiales (TANDA 9). */

export type TipoDocumento =
  | "boletin_periodo"
  | "boletin_anual"
  | "certificacion"
  | "constancia_inscripcion"
  | "record_notas"
  | "buena_conducta"
  | "carta_conclusion_primaria";

export const TIPO_DOC_LABELS: Record<TipoDocumento, string> = {
  boletin_periodo: "Boletín por período",
  boletin_anual: "Boletín consolidado anual",
  certificacion: "Certificación de estudios",
  constancia_inscripcion: "Constancia de inscripción",
  record_notas: "Récord de notas (MINERD)",
  buena_conducta: "Carta de buena conducta",
  carta_conclusion_primaria: "Carta de conclusión Nivel Primario",
};

export interface DocumentoEmitido {
  id: string;
  folio: string;
  tipo: TipoDocumento;
  estudiante_id: string | null;
  anio_id: string | null;
  periodo_id: string | null;
  emitido_email: string | null;
  created_at: string;
}

export interface NotaBoletin {
  asignatura_id: string;
  periodo_orden: number;
  nota: number;
}
