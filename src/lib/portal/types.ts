/** Tipos de dominio del portal de familias (TANDA 15). */

export interface PortalEstudiante {
  estudiante_id: string;
  nombres: string;
  apellidos: string;
  codigo: string;
  seccion: string;
  nivel: string;
  pendiente: number;
  bloqueado: boolean;
}

export interface PortalCalificacion {
  asignatura: string;
  promedio: number;
}

export interface PortalAsistencia {
  presente: number;
  ausente: number;
  tardanza: number;
  excusa: number;
  retiro: number;
  total: number;
}

export interface PortalCargo {
  concepto: string;
  monto: number;
  vencimiento: string | null;
  estado: string;
  vencido: boolean;
}
