/** Tipos de dominio de evaluación de Nivel Inicial (TANDA 8). */

export type EscalaInicial = "en_proceso" | "logrado" | "consolidado";

export const ESCALA_INICIAL: EscalaInicial[] = [
  "en_proceso",
  "logrado",
  "consolidado",
];

export const ESCALA_INICIAL_LABELS: Record<EscalaInicial, string> = {
  en_proceso: "En proceso",
  logrado: "Logrado",
  consolidado: "Consolidado",
};

export const ESCALA_INICIAL_EMOJI: Record<EscalaInicial, string> = {
  en_proceso: "🌱",
  logrado: "🌿",
  consolidado: "🌳",
};

export interface AreaDesarrollo {
  id: string;
  sede_id: string;
  nombre: string;
  codigo: string;
  orden: number;
}

export interface IndicadorLogro {
  id: string;
  area_id: string;
  descripcion: string;
  orden: number;
}

export interface EvaluacionInicial {
  id: string;
  seccion_id: string;
  estudiante_id: string;
  indicador_id: string;
  periodo_id: string;
  valor: EscalaInicial;
}

export interface ObservacionInicial {
  id: string;
  seccion_id: string;
  estudiante_id: string;
  periodo_id: string;
  texto: string;
}
