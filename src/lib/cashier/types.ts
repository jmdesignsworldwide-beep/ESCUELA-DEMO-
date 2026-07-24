/** Tipos de dominio de caja (TANDA 12). */

export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "cheque";

export const METODO_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
};

export const METODOS: MetodoPago[] = [
  "efectivo",
  "transferencia",
  "tarjeta",
  "cheque",
];

export interface CargoSaldo {
  cargo_id: string;
  descripcion: string;
  monto: number;
  pagado: number;
  saldo: number;
}

export interface Pago {
  id: string;
  recibo: string;
  ncf: string;
  estudiante_id: string | null;
  familia_id: string | null;
  metodo: MetodoPago;
  monto: number;
  referencia: string | null;
  cajero_email: string | null;
  fecha: string;
  anulado?: boolean;
}

export interface AplicacionDetalle {
  descripcion: string;
  monto: number;
}

export interface CierreCaja {
  id: string;
  fecha: string;
  total_efectivo: number;
  total_transferencia: number;
  total_tarjeta: number;
  total_cheque: number;
  total: number;
  num_pagos: number;
}
