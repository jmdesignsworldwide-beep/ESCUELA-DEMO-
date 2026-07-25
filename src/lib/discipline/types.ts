/** Tipos de dominio de disciplina y conducta (TANDA 17). */

export type CategoriaDisciplina = "merito" | "demerito";
export type GravedadDisciplina = "leve" | "grave" | "muy_grave";

export const CATEGORIA_LABELS: Record<CategoriaDisciplina, string> = {
  merito: "Mérito",
  demerito: "Demérito",
};

export const GRAVEDAD_LABELS: Record<GravedadDisciplina, string> = {
  leve: "Leve",
  grave: "Grave",
  muy_grave: "Muy grave",
};

/** Puntos sugeridos por categoría/gravedad. */
export const PUNTOS_SUGERIDOS: Record<string, number> = {
  merito: 5,
  demerito_leve: -2,
  demerito_grave: -5,
  demerito_muy_grave: -10,
};

export interface Incidencia {
  id: string;
  sede_id: string;
  estudiante_id: string;
  anio_id: string | null;
  categoria: CategoriaDisciplina;
  gravedad: GravedadDisciplina | null;
  titulo: string;
  descripcion: string | null;
  medida: string | null;
  puntos: number;
  fecha: string;
  reportado_email: string | null;
  created_at: string;
}

export interface ResumenDisciplina {
  meritos: number;
  demeritos: number;
  puntos: number;
}

export interface ConductaPortal {
  fecha: string;
  categoria: CategoriaDisciplina;
  gravedad: GravedadDisciplina | null;
  titulo: string;
  descripcion: string | null;
  medida: string | null;
  puntos: number;
}
