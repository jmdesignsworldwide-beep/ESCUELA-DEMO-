/** Tipos y constantes de analítica de asistencia (TANDA C) — client-safe. */

export const MESES_ABREV = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export interface AsistenciaDashboard {
  registros: number;
  pct_global: number;
  estudiantes_total: number;
  estudiantes_riesgo: number;
}
export interface TendenciaMes {
  anio_cal: number;
  mes: number;
  pct: number;
  registros: number;
}
export interface AsistenciaNivel {
  nivel: string;
  nivel_orden: number;
  pct: number;
  registros: number;
}
export interface AsistenciaSeccionResumen {
  estudiante_id: string;
  dias: number;
  presentes: number;
  ausencias: number;
  tardanzas: number;
  pct: number;
  en_riesgo: boolean;
}
export interface AsistenciaMes {
  anio_cal: number;
  mes: number;
  presentes: number;
  ausencias: number;
  pct: number;
}
export interface AsistenciaPeriodo {
  orden: number;
  nombre: string;
  pct: number;
}
