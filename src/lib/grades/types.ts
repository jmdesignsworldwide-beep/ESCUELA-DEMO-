/** Tipos de dominio de calificaciones (TANDA 7). */

export const NOTA_MINIMA = 70;

export interface CalificacionComponente {
  id: string;
  seccion_id: string;
  asignatura_id: string;
  periodo_id: string;
  estudiante_id: string;
  componente_id: string;
  valor: number;
}

export interface LibroCierre {
  id: string;
  seccion_id: string;
  asignatura_id: string;
  periodo_id: string;
  cerrado: boolean;
  cerrado_at: string | null;
}

/** Nota ponderada del período: Σ valor·peso/100. */
export function notaPonderada(
  valores: { componente_id: string; valor: number }[],
  pesos: Map<string, number>,
): number {
  let suma = 0;
  for (const v of valores) {
    const peso = pesos.get(v.componente_id) ?? 0;
    suma += (v.valor * peso) / 100;
  }
  return Math.round(suma * 100) / 100;
}
