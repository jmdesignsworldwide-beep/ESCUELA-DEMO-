/** Tipos de dominio de nómina (TANDA 14). */

export type TipoNomina = "ordinaria" | "regalia";
export type EstadoNomina = "borrador" | "cerrada";

export const TIPO_NOMINA_LABELS: Record<TipoNomina, string> = {
  ordinaria: "Ordinaria",
  regalia: "Regalía pascual",
};

export const ESTADO_NOMINA_LABELS: Record<EstadoNomina, string> = {
  borrador: "Borrador",
  cerrada: "Cerrada",
};

export const MESES_NOMINA: { n: number; nombre: string }[] = [
  { n: 1, nombre: "Enero" },
  { n: 2, nombre: "Febrero" },
  { n: 3, nombre: "Marzo" },
  { n: 4, nombre: "Abril" },
  { n: 5, nombre: "Mayo" },
  { n: 6, nombre: "Junio" },
  { n: 7, nombre: "Julio" },
  { n: 8, nombre: "Agosto" },
  { n: 9, nombre: "Septiembre" },
  { n: 10, nombre: "Octubre" },
  { n: 11, nombre: "Noviembre" },
  { n: 12, nombre: "Diciembre" },
];

export function nombreMes(n: number): string {
  return MESES_NOMINA.find((m) => m.n === n)?.nombre ?? String(n);
}

export interface ConfigNomina {
  id: string;
  sede_id: string;
  afp_pct: number;
  sfs_pct: number;
  tope_afp: number;
  tope_sfs: number;
  isr_exento: number;
  isr_limite2: number;
  isr_limite3: number;
  isr_monto2: number;
  isr_monto3: number;
  isr_tasa1: number;
  isr_tasa2: number;
  isr_tasa3: number;
}

export interface ContratoNomina {
  id: string;
  empleado_id: string;
  salario_base: number;
  activo: boolean;
}

export interface Nomina {
  id: string;
  sede_id: string;
  anio: number;
  mes: number;
  tipo: TipoNomina;
  estado: EstadoNomina;
  cerrada_at: string | null;
  cerrada_por: string | null;
  created_at: string;
}

export interface NominaLinea {
  id: string;
  nomina_id: string;
  empleado_id: string;
  salario_base: number;
  afp: number;
  sfs: number;
  isr: number;
  otros_ingresos: number;
  otras_deducciones: number;
  total_ingresos: number;
  total_deducciones: number;
  neto: number;
}

export interface ResumenNomina {
  empleados: number;
  total_bruto: number;
  total_afp: number;
  total_sfs: number;
  total_isr: number;
  total_neto: number;
}
