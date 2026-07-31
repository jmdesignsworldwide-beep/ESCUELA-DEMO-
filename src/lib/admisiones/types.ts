export type EstadoSolicitud =
  | "recibida"
  | "en_revision"
  | "entrevista"
  | "aceptada"
  | "lista_espera"
  | "rechazada"
  | "matriculada";

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitud, string> = {
  recibida: "Recibida",
  en_revision: "En revisión",
  entrevista: "Entrevista",
  aceptada: "Aceptada",
  lista_espera: "Lista de espera",
  rechazada: "Rechazada",
  matriculada: "Matriculada",
};

/** Clases de color por estado (chips) — funcionan en ambos temas. */
export const ESTADO_SOLICITUD_STYLES: Record<EstadoSolicitud, string> = {
  recibida: "bg-primary/10 text-primary border-primary/20",
  en_revision: "bg-gold/15 text-gold-foreground border-gold/30",
  entrevista: "bg-primary/10 text-primary border-primary/20",
  aceptada: "bg-success/15 text-success border-success/30",
  lista_espera: "bg-muted text-muted-foreground border-border",
  rechazada: "bg-destructive/10 text-destructive border-destructive/20",
  matriculada: "bg-success/20 text-success border-success/40",
};

/** Orden del embudo para KPIs y columnas. */
export const ESTADO_SOLICITUD_ORDEN: EstadoSolicitud[] = [
  "recibida",
  "en_revision",
  "entrevista",
  "aceptada",
  "lista_espera",
  "rechazada",
  "matriculada",
];

/** Estados a los que se puede transicionar manualmente (sin matriculada). */
export const ESTADOS_TRANSICION: EstadoSolicitud[] = [
  "recibida",
  "en_revision",
  "entrevista",
  "aceptada",
  "lista_espera",
  "rechazada",
];

export interface GradoOpcion {
  id: string;
  etiqueta: string;
}

export interface AdmisionesResumen {
  recibida: number;
  en_revision: number;
  entrevista: number;
  aceptada: number;
  lista_espera: number;
  rechazada: number;
  matriculada: number;
  total: number;
}

export interface SolicitudAdmision {
  id: string;
  codigo: string;
  anio_escolar: string;
  grado: string;
  aspirante: string;
  sexo: "M" | "F";
  fecha_nacimiento: string;
  nacionalidad: string;
  colegio_procedencia: string | null;
  tutor: string;
  parentesco: string;
  telefono: string;
  email: string | null;
  cedula: string | null;
  mensaje: string | null;
  estado: EstadoSolicitud;
  notas_internas: string | null;
  entrevista_at: string | null;
  decidido_at: string | null;
  estudiante_id: string | null;
  created_at: string;
}

export interface AdmisionEvento {
  id: string;
  estado_anterior: EstadoSolicitud | null;
  estado_nuevo: EstadoSolicitud;
  nota: string | null;
  created_at: string;
}

/** Resultado de la consulta pública de seguimiento. */
export interface ConsultaAdmision {
  existe: boolean;
  codigo: string | null;
  aspirante: string | null;
  grado: string | null;
  estado: EstadoSolicitud | null;
  actualizada: string | null;
}
