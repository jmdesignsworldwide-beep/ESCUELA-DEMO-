import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface Cumpleanos {
  tipo: "estudiante" | "empleado";
  nombre: string;
  fecha_nacimiento: string;
  dia: number;
  mes: number;
  edad: number;
  dias_para: number;
}

export async function getProximosCumpleanos(
  dias = 15,
): Promise<Cumpleanos[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("proximos_cumpleanos", { p_dias: dias });
  return ((data as Cumpleanos[]) ?? []).map((c) => ({
    tipo: c.tipo,
    nombre: c.nombre,
    fecha_nacimiento: c.fecha_nacimiento,
    dia: Number(c.dia),
    mes: Number(c.mes),
    edad: Number(c.edad),
    dias_para: Number(c.dias_para),
  }));
}
