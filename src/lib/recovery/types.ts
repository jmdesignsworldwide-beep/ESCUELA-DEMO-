/** Tipos de dominio de recuperación (TANDA 10). */

import { NOTA_MINIMA } from "@/lib/grades/types";

export type InstanciaRecuperacion =
  | "completivo"
  | "extraordinario"
  | "especial";

export const INSTANCIAS: InstanciaRecuperacion[] = [
  "completivo",
  "extraordinario",
  "especial",
];

export const INSTANCIA_LABELS: Record<InstanciaRecuperacion, string> = {
  completivo: "Completivo",
  extraordinario: "Extraordinario",
  especial: "Especial",
};

export const NOTA_MAX_RECUPERACION = 70;

export interface Recuperacion {
  id: string;
  estudiante_id: string;
  asignatura_id: string;
  anio_id: string;
  seccion_id: string;
  instancia: InstanciaRecuperacion;
  nota: number;
}

export interface PromedioFinal {
  estudiante_id: string;
  asignatura_id: string;
  promedio: number;
}

export type EstadoPromocion = "promovido" | "condicionado" | "repite";

export const ESTADO_PROMOCION_LABELS: Record<EstadoPromocion, string> = {
  promovido: "Promovido",
  condicionado: "Promoción condicionada",
  repite: "Repite el grado",
};

export function estadoPromocion(reprobadas: number): EstadoPromocion {
  if (reprobadas >= 3) return "repite";
  if (reprobadas >= 1) return "condicionado";
  return "promovido";
}

/** Siguiente instancia según cuántas recuperaciones ya se registraron. */
export function siguienteInstancia(
  registradas: number,
): InstanciaRecuperacion | null {
  return INSTANCIAS[registradas] ?? null;
}

export { NOTA_MINIMA };
