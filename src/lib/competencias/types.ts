/** Dominio de calificación por competencias (TANDA A · Ord. 04-2023). */

export interface CompetenciaFundamental {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface CompetenciaEspecifica {
  id: string;
  asignatura_id: string;
  codigo: string;
  nombre: string;
  orden: number;
}

export interface BandaDesempeno {
  id: string;
  nombre_corto: string;
  etiqueta: string;
  min_valor: number;
  max_valor: number;
  color: string;
  orden: number;
}

export interface CalificacionCompetencia {
  id: string;
  seccion_id: string;
  asignatura_id: string;
  periodo_id: string;
  estudiante_id: string;
  fundamental_id: string | null;
  especifica_id: string | null;
  valor: number;
}

/** Columna del libro por competencia: una fundamental o una específica. */
export interface ColumnaCompetencia {
  key: string; // `f:${id}` | `e:${id}`
  tipo: "fundamental" | "especifica";
  id: string;
  codigo: string;
  nombre: string;
}

// Boletín ────────────────────────────────────────────────────────────────
export interface BoletinAreaRow {
  asignatura_id: string;
  asignatura: string;
  area: string;
  orden: number;
  nota_area: number;
  banda: string | null;
  banda_corta: string | null;
  color: string | null;
  min_aprob: number | null;
  aprobada: boolean;
}

export interface BoletinDetalleRow {
  asignatura_id: string;
  asignatura: string;
  competencia_id: string;
  competencia: string;
  comp_orden: number;
  valor: number;
  banda: string | null;
  color: string | null;
}

export interface BoletinFundamentalRow {
  competencia_id: string;
  competencia: string;
  comp_orden: number;
  promedio: number;
  banda: string | null;
  color: string | null;
}

/** Resuelve la banda de un valor 0–100 en el catálogo de la sede. */
export function bandaDe(
  valor: number | null,
  bandas: BandaDesempeno[],
): BandaDesempeno | null {
  if (valor === null) return null;
  return (
    bandas.find((b) => valor >= b.min_valor && valor <= b.max_valor) ?? null
  );
}
