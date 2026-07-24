/** Tipos de dominio financiero (TANDA 11). */

export type TipoConcepto =
  | "inscripcion"
  | "mensualidad"
  | "uniforme"
  | "transporte"
  | "excursion"
  | "otro";

export type TipoBeca = "completa" | "media" | "porcentaje";
export type EstadoCargo = "pendiente" | "pagado" | "parcial" | "anulado";

export const TIPO_BECA_LABELS: Record<TipoBeca, string> = {
  completa: "Beca completa",
  media: "Media beca",
  porcentaje: "Porcentaje",
};

export const ESTADO_CARGO_LABELS: Record<EstadoCargo, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  parcial: "Parcial",
  anulado: "Anulado",
};

export const MESES: { n: number; nombre: string }[] = [
  { n: 8, nombre: "Agosto" },
  { n: 9, nombre: "Septiembre" },
  { n: 10, nombre: "Octubre" },
  { n: 11, nombre: "Noviembre" },
  { n: 12, nombre: "Diciembre" },
  { n: 1, nombre: "Enero" },
  { n: 2, nombre: "Febrero" },
  { n: 3, nombre: "Marzo" },
  { n: 4, nombre: "Abril" },
  { n: 5, nombre: "Mayo" },
  { n: 6, nombre: "Junio" },
];

export interface ConfigFinanciera {
  id: string;
  sede_id: string;
  moneda: string;
  num_mensualidades: number;
  dia_vencimiento: number;
  desc_2do: number;
  desc_3ro: number;
  desc_4to: number;
  mora_monto: number;
  mora_dia: number;
  bloqueo_por_morosidad?: boolean;
  dias_gracia?: number;
}

export interface ConceptoCobro {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  monto: number;
  recurrente: boolean;
  orden: number;
  activo: boolean;
}

export interface Beca {
  id: string;
  estudiante_id: string;
  tipo: TipoBeca;
  porcentaje: number;
  motivo: string | null;
  activa: boolean;
}

export interface Cargo {
  id: string;
  estudiante_id: string;
  familia_id: string | null;
  concepto_id: string | null;
  descripcion: string;
  mes: number | null;
  monto_base: number;
  descuento: number;
  monto: number;
  vencimiento: string | null;
  estado: EstadoCargo;
}

export interface ResumenFamilia {
  familia_id: string;
  apellido: string;
  estudiantes: number;
  total_neto: number;
  pendiente: number;
}
