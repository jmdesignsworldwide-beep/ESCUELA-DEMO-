/** Tipos de dominio de asistencia (TANDA 6). */

export type EstadoAsistencia =
  | "presente"
  | "ausente"
  | "tardanza"
  | "excusa"
  | "retiro_anticipado";

export const ESTADOS_ASISTENCIA: EstadoAsistencia[] = [
  "presente",
  "ausente",
  "tardanza",
  "excusa",
  "retiro_anticipado",
];

export const ESTADO_ASISTENCIA_LABELS: Record<EstadoAsistencia, string> = {
  presente: "Presente",
  ausente: "Ausente",
  tardanza: "Tardanza",
  excusa: "Excusa",
  retiro_anticipado: "Retiro anticipado",
};

export const ESTADO_ASISTENCIA_CORTO: Record<EstadoAsistencia, string> = {
  presente: "P",
  ausente: "A",
  tardanza: "T",
  excusa: "E",
  retiro_anticipado: "R",
};

export interface AsistenciaSesion {
  id: string;
  anio_id: string;
  seccion_id: string;
  asignatura_id: string | null;
  empleado_id: string | null;
  fecha: string;
  cerrada: boolean;
  cerrada_at: string | null;
}

export interface AsistenciaRegistro {
  id: string;
  sesion_id: string;
  estudiante_id: string;
  estado: EstadoAsistencia;
  observacion: string | null;
}

export interface ResumenAsistencia {
  seccion_id: string;
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  otros: number;
}

export interface Ausentismo {
  estudiante_id: string;
  ausencias: number;
}
