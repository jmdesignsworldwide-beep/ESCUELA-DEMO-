/** Tipos de dominio de horarios (TANDA 5). */

export interface Periodo {
  n: number;
  inicio: string; // "08:00"
  fin: string; // "08:45"
}

/** Períodos del día (deben coincidir con la semilla de la migración). */
export const PERIODOS: Periodo[] = [
  { n: 1, inicio: "08:00", fin: "08:45" },
  { n: 2, inicio: "08:45", fin: "09:30" },
  { n: 3, inicio: "09:30", fin: "10:15" },
  { n: 4, inicio: "10:30", fin: "11:15" },
  { n: 5, inicio: "11:15", fin: "12:00" },
  { n: 6, inicio: "12:00", fin: "12:45" },
];

export const DIAS: { n: number; nombre: string; corto: string }[] = [
  { n: 1, nombre: "Lunes", corto: "Lun" },
  { n: 2, nombre: "Martes", corto: "Mar" },
  { n: 3, nombre: "Miércoles", corto: "Mié" },
  { n: 4, nombre: "Jueves", corto: "Jue" },
  { n: 5, nombre: "Viernes", corto: "Vie" },
];

export interface HorarioBloque {
  id: string;
  anio_id: string;
  seccion_id: string;
  asignatura_id: string;
  empleado_id: string;
  aula_id: string | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

/** hh:mm:ss → hh:mm */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}
