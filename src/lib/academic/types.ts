/** Tipos de dominio de la estructura académica (TANDA 2). */

export type TipoEvaluacion = "cualitativa" | "numerica";
export type CicloSecundaria = "primer_ciclo" | "segundo_ciclo";
export type Modalidad =
  | "general"
  | "academica"
  | "tecnico_profesional"
  | "artes";
export type EstadoPeriodo = "pendiente" | "en_curso" | "cerrado";

export const MODALIDAD_LABELS: Record<Modalidad, string> = {
  general: "General",
  academica: "Académica",
  tecnico_profesional: "Técnico-Profesional",
  artes: "Artes",
};

export const CICLO_LABELS: Record<CicloSecundaria, string> = {
  primer_ciclo: "Primer Ciclo",
  segundo_ciclo: "Segundo Ciclo",
};

export const ESTADO_PERIODO_LABELS: Record<EstadoPeriodo, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  cerrado: "Cerrado",
};

export interface Periodo {
  id: string;
  anio_id: string;
  nombre: string;
  orden: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPeriodo;
}

export interface Nivel {
  id: string;
  sede_id: string;
  nombre: string;
  codigo: string;
  orden: number;
  tipo_evaluacion: TipoEvaluacion;
}

export interface Grado {
  id: string;
  nivel_id: string;
  nombre: string;
  codigo: string;
  orden: number;
  ciclo: CicloSecundaria | null;
}

export interface Jornada {
  id: string;
  sede_id: string;
  nombre: string;
  codigo: string;
  orden: number;
}

export interface Aula {
  id: string;
  sede_id: string;
  nombre: string;
  codigo: string;
  capacidad: number;
  ubicacion: string | null;
}

export interface Asignatura {
  id: string;
  sede_id: string;
  nombre: string;
  codigo: string;
  area: string | null;
  es_base: boolean;
}

export interface Seccion {
  id: string;
  anio_id: string;
  grado_id: string;
  nombre: string;
  jornada_id: string;
  aula_id: string | null;
  modalidad: Modalidad | null;
  cupo: number;
  activa: boolean;
}

export interface PensumItem {
  id: string;
  grado_id: string;
  asignatura_id: string;
  horas_semanales: number;
  orden: number;
}

export interface EsquemaPonderacion {
  id: string;
  sede_id: string;
  nivel_id: string | null;
  nombre: string;
  activo: boolean;
}

export interface ComponentePonderacion {
  id: string;
  esquema_id: string;
  nombre: string;
  codigo: string;
  peso: number;
  orden: number;
}
