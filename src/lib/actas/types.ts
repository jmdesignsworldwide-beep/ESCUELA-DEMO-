/** Dominio de actas, promedios y cuadro de honor (TANDA B). */

export type SituacionAcademica =
  | "promovido"
  | "completivo"
  | "promovido_automatico"
  | "reprobado"
  | "condicion_asistencia"
  | "evaluacion_cualitativa";

export const SITUACION_LABELS: Record<SituacionAcademica, string> = {
  promovido: "Promovido",
  completivo: "Completivo",
  promovido_automatico: "Promovido (no repitencia)",
  reprobado: "Reprobado",
  condicion_asistencia: "Condición por asistencia",
  evaluacion_cualitativa: "Evaluación cualitativa",
};

/** Color semántico para badges por situación. */
export const SITUACION_VARIANT: Record<
  SituacionAcademica,
  "success" | "gold" | "destructive" | "secondary"
> = {
  promovido: "success",
  promovido_automatico: "success",
  completivo: "gold",
  reprobado: "destructive",
  condicion_asistencia: "destructive",
  evaluacion_cualitativa: "secondary",
};

export interface SituacionRow {
  estudiante_id: string;
  promedio_general: number | null;
  reprobadas: number;
  asistencia: number;
  asistencia_ok: boolean;
  situacion: SituacionAcademica;
}

export interface PromedioAsignaturaRow {
  asignatura_id: string;
  promedio: number;
  aprobados: number;
  reprobados: number;
}

export interface CuadroHonorRow {
  estudiante_id: string;
  promedio_general: number;
  asistencia: number;
  puesto: number;
}

export interface PromediosResumenRow {
  seccion_id: string;
  seccion: string;
  grado: string;
  grado_orden: number;
  nivel: string;
  nivel_orden: number;
  estudiantes: number;
  promedio_general: number | null;
  promovidos: number;
  completivo: number;
  reprobados: number;
  condicion_asistencia: number;
}
