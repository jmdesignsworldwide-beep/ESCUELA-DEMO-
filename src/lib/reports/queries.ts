import "server-only";

import { createClient } from "@/lib/supabase/server";
import { nombreMes } from "@/lib/payroll/types";

export interface DashKpis {
  estudiantes: number;
  docentes: number;
  cobrado: number;
  pendiente: number;
  familias_morosas: number;
}

export interface Punto {
  label: string;
  value: number;
}

export interface IngresoMes {
  mes: number;
  label: string;
  esperado: number;
  cobrado: number;
}

/** Orden del año escolar dominicano (agosto → junio). */
const ORDEN_MES = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];

export async function getDashKpis(): Promise<DashKpis> {
  const supabase = createClient();
  const { data } = await supabase.rpc("dash_kpis").maybeSingle<DashKpis>();
  const r = data ?? {
    estudiantes: 0,
    docentes: 0,
    cobrado: 0,
    pendiente: 0,
    familias_morosas: 0,
  };
  return {
    estudiantes: Number(r.estudiantes),
    docentes: Number(r.docentes),
    cobrado: Number(r.cobrado),
    pendiente: Number(r.pendiente),
    familias_morosas: Number(r.familias_morosas),
  };
}

export async function getMatriculaNivel(): Promise<Punto[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("dash_matricula_nivel");
  return ((data as { nivel: string; cantidad: number }[]) ?? []).map((r) => ({
    label: r.nivel,
    value: Number(r.cantidad),
  }));
}

export async function getIngresosMes(): Promise<IngresoMes[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("dash_ingresos_mes");
  const rows = ((data as { mes: number; esperado: number; cobrado: number }[]) ??
    []).map((r) => ({
    mes: Number(r.mes),
    label: nombreMes(Number(r.mes)).slice(0, 3),
    esperado: Number(r.esperado),
    cobrado: Number(r.cobrado),
  }));
  return rows.sort((a, b) => ORDEN_MES.indexOf(a.mes) - ORDEN_MES.indexOf(b.mes));
}

export async function getMorosidadAging(): Promise<Punto[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("dash_morosidad_aging");
  return ((data as { bucket: string; monto: number }[]) ?? []).map((r) => ({
    label: r.bucket,
    value: Number(r.monto),
  }));
}

export async function getRendimientoNivel(): Promise<Punto[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("dash_rendimiento_nivel");
  return ((data as { nivel: string; promedio: number }[]) ?? []).map((r) => ({
    label: r.nivel,
    value: Number(r.promedio),
  }));
}
