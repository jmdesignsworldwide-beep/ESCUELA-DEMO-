import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ConfigFinanciera,
  ConceptoCobro,
  Beca,
  Cargo,
  ResumenFamilia,
} from "@/lib/finance/types";

export async function getConfig(
  sedeId: string,
): Promise<ConfigFinanciera | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("config_financiera")
    .select("*")
    .eq("sede_id", sedeId)
    .maybeSingle<ConfigFinanciera>();
  return data ?? null;
}

export async function getConceptos(sedeId: string): Promise<ConceptoCobro[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("conceptos_cobro")
    .select("*")
    .eq("sede_id", sedeId)
    .order("orden");
  return ((data as (ConceptoCobro & { monto: number })[]) ?? []).map((c) => ({
    ...c,
    monto: Number(c.monto),
  }));
}

export async function getBecas(): Promise<Beca[]> {
  const supabase = createClient();
  const { data } = await supabase.from("becas").select("*").eq("activa", true);
  return ((data as (Beca & { porcentaje: number })[]) ?? []).map((b) => ({
    ...b,
    porcentaje: Number(b.porcentaje),
  }));
}

export async function getResumenFamilias(): Promise<ResumenFamilia[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("resumen_familias");
  return ((data as ResumenFamilia[]) ?? [])
    .map((f) => ({
      ...f,
      estudiantes: Number(f.estudiantes),
      total_neto: Number(f.total_neto),
      pendiente: Number(f.pendiente),
    }))
    .sort((a, b) => b.pendiente - a.pendiente);
}

export async function getCargosFamilia(familiaId: string): Promise<Cargo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("cargos")
    .select("*")
    .eq("familia_id", familiaId)
    .neq("estado", "anulado")
    .order("vencimiento");
  return ((data as (Cargo & { monto: number })[]) ?? []).map((c) => ({
    ...c,
    monto_base: Number(c.monto_base),
    descuento: Number(c.descuento),
    monto: Number(c.monto),
  }));
}
