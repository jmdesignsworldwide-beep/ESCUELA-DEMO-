import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface MorosidadFamilia {
  familia_id: string;
  apellido: string;
  saldo: number;
  b_0_30: number;
  b_31_60: number;
  b_61_90: number;
  b_90mas: number;
  dias_max: number;
  cargos_vencidos: number;
  mora: number;
}

export interface Proyeccion {
  esperado: number;
  cobrado: number;
  pendiente: number;
}

export async function getPanelMorosidad(): Promise<MorosidadFamilia[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("panel_morosidad");
  return ((data as MorosidadFamilia[]) ?? [])
    .map((f) => ({
      familia_id: f.familia_id,
      apellido: f.apellido,
      saldo: Number(f.saldo),
      b_0_30: Number(f.b_0_30),
      b_31_60: Number(f.b_31_60),
      b_61_90: Number(f.b_61_90),
      b_90mas: Number(f.b_90mas),
      dias_max: Number(f.dias_max),
      cargos_vencidos: Number(f.cargos_vencidos),
      mora: Number(f.mora),
    }))
    .sort((a, b) => b.saldo - a.saldo);
}

export async function getProyeccion(mes: number): Promise<Proyeccion> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("proyeccion_mes", { p_mes: mes })
    .maybeSingle<Proyeccion>();
  return {
    esperado: Number(data?.esperado ?? 0),
    cobrado: Number(data?.cobrado ?? 0),
    pendiente: Number(data?.pendiente ?? 0),
  };
}
