/** Tipos de dominio de comunicación (TANDA 16). */

export type TipoCircular = "circular" | "aviso" | "urgente";
export type AudienciaCircular =
  | "todos"
  | "nivel"
  | "seccion"
  | "morosos"
  | "tutores";

export const TIPO_CIRCULAR_LABELS: Record<TipoCircular, string> = {
  circular: "Circular",
  aviso: "Aviso",
  urgente: "Urgente",
};

export const AUDIENCIA_LABELS: Record<AudienciaCircular, string> = {
  todos: "Toda la comunidad",
  nivel: "Un nivel",
  seccion: "Una sección",
  morosos: "Familias con saldo pendiente",
  tutores: "Padres y tutores",
};

export interface Circular {
  id: string;
  sede_id: string;
  autor_id: string | null;
  titulo: string;
  cuerpo: string;
  tipo: TipoCircular;
  audiencia: AudienciaCircular;
  nivel_id: string | null;
  seccion_id: string | null;
  folio: string | null;
  publicada: boolean;
  publicada_at: string | null;
  created_at: string;
}

export interface CircularVisible {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: TipoCircular;
  folio: string | null;
  publicada_at: string | null;
}

export interface DestinatarioCircular {
  estudiante: string;
  tutor: string;
  telefono: string | null;
}
