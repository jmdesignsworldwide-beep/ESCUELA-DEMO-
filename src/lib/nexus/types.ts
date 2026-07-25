/** Tipos de la capa de control de acceso demo (JM Nexus). */

export interface MiAccesoDemo {
  activa: boolean;
  vence_at: string | null;
  dias_restantes: number | null;
  sin_vencimiento: boolean;
  bloqueado: boolean;
}

export type EstadoAcceso = "vigente" | "vencida" | "revocada" | "ilimitada";

export interface AccesoDemo {
  id: string;
  etiqueta: string;
  email: string;
  vence_at: string | null;
  dias_restantes: number | null;
  activa: boolean;
  estado: EstadoAcceso;
  created_at: string;
}

export const ESTADO_ACCESO_LABELS: Record<EstadoAcceso, string> = {
  vigente: "Vigente",
  vencida: "Vencida",
  revocada: "Revocada",
  ilimitada: "Sin vencimiento",
};
