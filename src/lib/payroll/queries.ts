import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ConfigNomina,
  ContratoNomina,
  Nomina,
  NominaLinea,
  ResumenNomina,
} from "@/lib/payroll/types";

function num<T>(row: T, keys: (keyof T)[]): T {
  const out: T = { ...row };
  for (const k of keys) {
    (out as Record<keyof T, unknown>)[k] = Number(row[k] ?? 0);
  }
  return out;
}

export async function getConfigNomina(
  sedeId: string,
): Promise<ConfigNomina | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("config_nomina")
    .select("*")
    .eq("sede_id", sedeId)
    .maybeSingle<ConfigNomina>();
  if (!data) return null;
  return num(data, [
    "afp_pct",
    "sfs_pct",
    "tope_afp",
    "tope_sfs",
    "isr_exento",
    "isr_limite2",
    "isr_limite3",
    "isr_monto2",
    "isr_monto3",
    "isr_tasa1",
    "isr_tasa2",
    "isr_tasa3",
  ]);
}

export async function getContratos(
  sedeId: string,
): Promise<Map<string, ContratoNomina>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contratos_nomina")
    .select("id, empleado_id, salario_base, activo, empleados!inner(sede_id)")
    .eq("activo", true)
    .eq("empleados.sede_id", sedeId);
  const map = new Map<string, ContratoNomina>();
  for (const c of (data as
    | (ContratoNomina & { salario_base: number })[]
    | null) ?? []) {
    map.set(c.empleado_id, {
      id: c.id,
      empleado_id: c.empleado_id,
      salario_base: Number(c.salario_base),
      activo: c.activo,
    });
  }
  return map;
}

export async function getNominas(sedeId: string): Promise<Nomina[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("nominas")
    .select("*")
    .eq("sede_id", sedeId)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  return (data as Nomina[]) ?? [];
}

export async function getNomina(id: string): Promise<Nomina | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("nominas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Nomina>();
  return data ?? null;
}

export async function getLineas(nominaId: string): Promise<NominaLinea[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("nomina_lineas")
    .select("*")
    .eq("nomina_id", nominaId);
  return ((data as NominaLinea[]) ?? []).map((l) =>
    num(l, [
      "salario_base",
      "afp",
      "sfs",
      "isr",
      "otros_ingresos",
      "otras_deducciones",
      "total_ingresos",
      "total_deducciones",
      "neto",
    ]),
  );
}

export async function getLinea(id: string): Promise<NominaLinea | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("nomina_lineas")
    .select("*")
    .eq("id", id)
    .maybeSingle<NominaLinea>();
  if (!data) return null;
  return num(data, [
    "salario_base",
    "afp",
    "sfs",
    "isr",
    "otros_ingresos",
    "otras_deducciones",
    "total_ingresos",
    "total_deducciones",
    "neto",
  ]);
}

export async function getResumenNomina(
  nominaId: string,
): Promise<ResumenNomina> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("resumen_nomina", { p_nomina: nominaId })
    .maybeSingle<ResumenNomina>();
  const r = data ?? {
    empleados: 0,
    total_bruto: 0,
    total_afp: 0,
    total_sfs: 0,
    total_isr: 0,
    total_neto: 0,
  };
  return {
    empleados: Number(r.empleados),
    total_bruto: Number(r.total_bruto),
    total_afp: Number(r.total_afp),
    total_sfs: Number(r.total_sfs),
    total_isr: Number(r.total_isr),
    total_neto: Number(r.total_neto),
  };
}
