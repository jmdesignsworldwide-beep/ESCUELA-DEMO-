/** Tipos de dominio de docentes y personal (TANDA 4). */

export type TipoEmpleado = "docente" | "administrativo" | "apoyo" | "directivo";
export type EstadoEmpleado = "activo" | "licencia" | "inactivo";

export const TIPO_EMPLEADO_LABELS: Record<TipoEmpleado, string> = {
  docente: "Docente",
  administrativo: "Administrativo",
  apoyo: "Apoyo",
  directivo: "Directivo",
};

export const ESTADO_EMPLEADO_LABELS: Record<EstadoEmpleado, string> = {
  activo: "Activo",
  licencia: "En licencia",
  inactivo: "Inactivo",
};

export interface Empleado {
  id: string;
  sede_id: string;
  profile_id: string | null;
  codigo: string;
  nombres: string;
  apellidos: string;
  cedula: string | null;
  tipo: TipoEmpleado;
  cargo: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_ingreso: string | null;
  titulo_academico: string | null;
  foto_path: string | null;
  estado: EstadoEmpleado;
  created_at: string;
  updated_at: string;
}

export interface DocenteSeccion {
  id: string;
  empleado_id: string;
  seccion_id: string;
  asignatura_id: string;
  anio_id: string;
  horas_semanales: number;
}

export interface EmpleadoDocumento {
  id: string;
  empleado_id: string;
  nombre: string;
  tipo: string | null;
  path: string;
  created_at: string;
}

export function nombreEmpleado(e: {
  nombres: string;
  apellidos: string;
}): string {
  return `${e.nombres} ${e.apellidos}`.trim();
}
