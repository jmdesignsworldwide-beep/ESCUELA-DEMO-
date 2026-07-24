/**
 * Tipos de dominio de JM ESCOLAR.
 * Los 7 roles del sistema (ver PROMPT MAESTRO §5).
 */

export const ROLES = [
  "director",
  "coordinador",
  "secretaria",
  "docente",
  "contabilidad",
  "tutor",
  "estudiante",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  director: "Director / Administrador",
  coordinador: "Subdirector / Coordinador académico",
  secretaria: "Secretaría / Registro",
  docente: "Docente",
  contabilidad: "Contabilidad / Caja",
  tutor: "Padre / Tutor",
  estudiante: "Estudiante",
};

export const ROLE_SHORT: Record<Role, string> = {
  director: "Director",
  coordinador: "Coordinador",
  secretaria: "Secretaría",
  docente: "Docente",
  contabilidad: "Contabilidad",
  tutor: "Tutor",
  estudiante: "Estudiante",
};

export type ProfileStatus = "activo" | "inactivo" | "suspendido";

export interface Profile {
  id: string;
  sede_id: string;
  nombre_completo: string;
  role: Role;
  status: ProfileStatus;
  email: string | null;
  telefono: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sede {
  id: string;
  nombre: string;
  codigo: string;
  activa: boolean;
}

export interface AnioEscolar {
  id: string;
  sede_id: string;
  nombre: string; // "2025–2026"
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}
