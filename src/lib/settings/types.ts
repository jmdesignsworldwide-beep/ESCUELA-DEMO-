/** Tipos de ajustes institucionales y bitácora (TANDA 20). */

export interface ConfigInstitucional {
  id: string;
  sede_id: string;
  nombre: string;
  siglas: string | null;
  ciudad: string | null;
  pais: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  rnc: string | null;
  director_nombre: string | null;
  lema: string | null;
}

export interface EntradaBitacora {
  id: number;
  actor_email: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface FiltroBitacora {
  accion?: string;
  entidad?: string;
  desde?: string;
}
