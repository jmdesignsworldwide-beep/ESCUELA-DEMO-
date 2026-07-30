import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CargoSaldo,
  Pago,
  AplicacionDetalle,
  CierreCaja,
} from "@/lib/cashier/types";

export async function getCargosSaldo(
  estudianteId: string,
): Promise<CargoSaldo[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("cargos_saldo", {
    p_estudiante: estudianteId,
  });
  return ((data as CargoSaldo[]) ?? []).map((c) => ({
    ...c,
    monto: Number(c.monto),
    pagado: Number(c.pagado),
    saldo: Number(c.saldo),
  }));
}

export async function getPagosDelDia(fecha: string): Promise<Pago[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pagos")
    .select("*, notas_credito(id)")
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });
  return ((data as (Pago & { notas_credito: { id: string }[] })[]) ?? []).map(
    (p) => ({
      ...p,
      monto: Number(p.monto),
      anulado: (p.notas_credito?.length ?? 0) > 0,
    }),
  );
}

export async function getPagoPorRecibo(recibo: string): Promise<Pago | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pagos")
    .select("*, notas_credito(id)")
    .eq("recibo", recibo)
    .maybeSingle<Pago & { notas_credito: { id: string }[] }>();
  if (!data) return null;
  return {
    ...data,
    monto: Number(data.monto),
    anulado: (data.notas_credito?.length ?? 0) > 0,
  };
}

export async function getAplicaciones(
  pagoId: string,
): Promise<AplicacionDetalle[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pago_aplicaciones")
    .select("monto, cargo:cargos(descripcion)")
    .eq("pago_id", pagoId);
  return (
    (data as unknown as {
      monto: number;
      cargo: { descripcion: string } | null;
    }[] | null) ?? []
  ).map((a) => ({
    descripcion: a.cargo?.descripcion ?? "Cargo",
    monto: Number(a.monto),
  }));
}

export async function getCierre(fecha: string): Promise<CierreCaja | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("cierres_caja")
    .select("*")
    .eq("fecha", fecha)
    .maybeSingle<CierreCaja>();
  return data ?? null;
}

export interface ComprobanteSecuencia {
  tipo: string;
  descripcion: string;
  vencimiento: string;
  electronico: boolean;
}

export async function getComprobanteSecuencia(
  ncf: string,
): Promise<ComprobanteSecuencia | null> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("comprobante_secuencia", { p_ncf: ncf })
    .maybeSingle<ComprobanteSecuencia>();
  return data ?? null;
}

export interface EstadoSecuenciaNcf {
  tipo: string;
  descripcion: string;
  prefijo: string;
  electronico: boolean;
  desde: number;
  hasta: number;
  vencimiento: string;
  usados: number;
  disponibles: number;
  vencida: boolean;
}

export async function getEstadoSecuenciasNcf(): Promise<EstadoSecuenciaNcf[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("estado_secuencias_ncf");
  return ((data as EstadoSecuenciaNcf[]) ?? []).map((s) => ({
    ...s,
    desde: Number(s.desde),
    hasta: Number(s.hasta),
    usados: Number(s.usados),
    disponibles: Number(s.disponibles),
  }));
}
