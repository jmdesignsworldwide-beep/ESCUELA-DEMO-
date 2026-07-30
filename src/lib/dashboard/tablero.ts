import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface TableroKpis {
  estudiantes_activos: number;
  docentes_activos: number;
  empleados_activos: number;
  promedio_general: number;
  pct_asistencia: number;
  riesgo_asistencia: number;
  prestamos_activos: number;
  circulares_mes: number;
}

export async function getTableroKpis(anioId: string): Promise<TableroKpis> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("tablero_kpis", { p_anio: anioId })
    .maybeSingle<TableroKpis>();
  return {
    estudiantes_activos: Number(data?.estudiantes_activos ?? 0),
    docentes_activos: Number(data?.docentes_activos ?? 0),
    empleados_activos: Number(data?.empleados_activos ?? 0),
    promedio_general: Number(data?.promedio_general ?? 0),
    pct_asistencia: Number(data?.pct_asistencia ?? 0),
    riesgo_asistencia: Number(data?.riesgo_asistencia ?? 0),
    prestamos_activos: Number(data?.prestamos_activos ?? 0),
    circulares_mes: Number(data?.circulares_mes ?? 0),
  };
}
