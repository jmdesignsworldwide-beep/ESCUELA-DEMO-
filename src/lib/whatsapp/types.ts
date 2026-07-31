export type CategoriaWhatsapp =
  | "general"
  | "cobro"
  | "circular"
  | "asistencia"
  | "calificaciones";

export const CATEGORIA_WA_LABELS: Record<CategoriaWhatsapp, string> = {
  general: "General",
  cobro: "Cobro",
  circular: "Circular",
  asistencia: "Asistencia",
  calificaciones: "Calificaciones",
};

export interface PlantillaWhatsapp {
  id: string;
  nombre: string;
  categoria: CategoriaWhatsapp;
  cuerpo: string;
}

export interface DestinatarioWhatsapp {
  estudiante_id: string;
  estudiante: string;
  tutor: string;
  telefono: string;
  saldo: number;
}

export interface EnvioWhatsappRow {
  id: string;
  estudiante: string | null;
  telefono: string;
  categoria: string;
  mensaje: string;
  created_at: string;
}
