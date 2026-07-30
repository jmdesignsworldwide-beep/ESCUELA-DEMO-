import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface EvaluacionEventual {
  id: string;
  estudiante_id: string;
  asignatura_id: string | null;
  titulo: string;
  descripcion: string | null;
  nota: number | null;
  fecha: string;
}

export interface EvaluacionEventualRow extends EvaluacionEventual {
  estudiante: string;
  asignatura: string | null;
}

export async function getEvaluacionesRecientes(
  limit = 30,
): Promise<EvaluacionEventualRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("evaluaciones_eventuales")
    .select(
      "*, estudiantes!inner(nombres, apellidos), asignaturas(nombre)",
    )
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows =
    (data as unknown as (EvaluacionEventual & {
      estudiantes: { nombres: string; apellidos: string };
      asignaturas: { nombre: string } | null;
    })[]) ?? [];
  return rows.map((r) => ({
    ...r,
    nota: r.nota === null ? null : Number(r.nota),
    estudiante: `${r.estudiantes.apellidos}, ${r.estudiantes.nombres}`,
    asignatura: r.asignaturas?.nombre ?? null,
  }));
}
