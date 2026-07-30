/** Dominio del ciclo de vida del estudiante (TANDA E). */

export type EstadoEstudiante =
  | "activo"
  | "inactivo"
  | "retirado"
  | "egresado"
  | "transferido";

export const ESTADO_ESTUDIANTE_LABELS: Record<EstadoEstudiante, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  retirado: "Retirado",
  egresado: "Egresado",
  transferido: "Transferido",
};

export const ESTADO_ESTUDIANTE_VARIANT: Record<
  EstadoEstudiante,
  "success" | "secondary" | "destructive" | "gold"
> = {
  activo: "success",
  inactivo: "secondary",
  retirado: "destructive",
  egresado: "gold",
  transferido: "secondary",
};

export type TipoMovimiento =
  | "retiro"
  | "reingreso"
  | "egreso"
  | "inactivacion"
  | "reactivacion"
  | "transferencia_entrante"
  | "transferencia_salida";

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  retiro: "Retiro",
  reingreso: "Reingreso",
  egreso: "Egreso",
  inactivacion: "Inactivación",
  reactivacion: "Reactivación",
  transferencia_entrante: "Transferencia entrante",
  transferencia_salida: "Transferencia de salida",
};

export interface MovimientoEstudiante {
  id: string;
  estudiante_id: string;
  tipo: TipoMovimiento;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  motivo: string | null;
  fecha: string;
  created_at: string;
}

export interface Convalidacion {
  id: string;
  estudiante_id: string;
  colegio_origen: string;
  anio_origen: string | null;
  grado: string | null;
  asignatura: string;
  nota: number;
  created_at: string;
}

export interface EstadoConteo {
  estado: EstadoEstudiante;
  cantidad: number;
}
