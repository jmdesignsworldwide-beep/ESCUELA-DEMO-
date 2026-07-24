/** Tipos de dominio de matrícula y expediente (TANDA 3). */

export type SexoEstudiante = "M" | "F";
export type EstadoEstudiante =
  | "activo"
  | "retirado"
  | "egresado"
  | "transferido";
export type Parentesco =
  | "padre"
  | "madre"
  | "tutor_legal"
  | "abuelo"
  | "abuela"
  | "tio"
  | "tia"
  | "otro";
export type TipoDocumento = "acta" | "cedula" | "pasaporte";
export type TipoMatricula = "inscripcion" | "reinscripcion";
export type EstadoMatricula = "activa" | "retirada" | "completada";

export const ESTADO_ESTUDIANTE_LABELS: Record<EstadoEstudiante, string> = {
  activo: "Activo",
  retirado: "Retirado",
  egresado: "Egresado",
  transferido: "Transferido",
};

export const PARENTESCO_LABELS: Record<Parentesco, string> = {
  padre: "Padre",
  madre: "Madre",
  tutor_legal: "Tutor legal",
  abuelo: "Abuelo",
  abuela: "Abuela",
  tio: "Tío",
  tia: "Tía",
  otro: "Otro",
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  acta: "Acta de nacimiento",
  cedula: "Cédula",
  pasaporte: "Pasaporte",
};

export interface Estudiante {
  id: string;
  sede_id: string;
  familia_id: string | null;
  profile_id: string | null;
  codigo: string;
  rne: string | null;
  nombres: string;
  apellidos: string;
  sexo: SexoEstudiante;
  fecha_nacimiento: string;
  lugar_nacimiento: string | null;
  nacionalidad: string;
  tipo_documento: TipoDocumento;
  numero_documento: string | null;
  direccion: string | null;
  tipo_sangre: string | null;
  alergias: string | null;
  condiciones_medicas: string | null;
  observaciones: string | null;
  foto_path: string | null;
  estado: EstadoEstudiante;
  created_at: string;
  updated_at: string;
}

export interface Tutor {
  id: string;
  sede_id: string;
  nombres: string;
  apellidos: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  ocupacion: string | null;
  direccion: string | null;
}

export interface EstudianteTutor {
  id: string;
  estudiante_id: string;
  tutor_id: string;
  parentesco: Parentesco;
  es_contacto_emergencia: boolean;
  autorizado_retirar: boolean;
  principal: boolean;
  tutor?: Tutor;
}

export interface Matricula {
  id: string;
  estudiante_id: string;
  anio_id: string;
  seccion_id: string;
  tipo: TipoMatricula;
  fecha: string;
  estado: EstadoMatricula;
}

/** Nombre completo y edad utilitarios. */
export function nombreCompleto(e: {
  nombres: string;
  apellidos: string;
}): string {
  return `${e.nombres} ${e.apellidos}`.trim();
}

export function edad(fechaNacimiento: string, hoy = new Date()): number {
  const nac = new Date(fechaNacimiento);
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e -= 1;
  return e;
}
