import "server-only";

import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import { getEstudiante, getMatriculasEstudiante } from "@/lib/students/queries";
import type { Nivel, Grado, Seccion } from "@/lib/academic/types";
import type { Estudiante } from "@/lib/students/types";
import type { AnioEscolar, Sede } from "@/lib/types";

export interface ContextoDoc {
  estudiante: Estudiante;
  nivel: Nivel | null;
  grado: Grado | null;
  seccion: Seccion | null;
  sede: Sede;
  anio: AnioEscolar;
}

/** Reúne el contexto académico de un estudiante para emitir documentos. */
export async function armarContexto(
  estudianteId: string,
): Promise<ContextoDoc | null> {
  const [estudiante, sede, anio] = await Promise.all([
    getEstudiante(estudianteId),
    getSedeActiva(),
    getAnioActivo(),
  ]);
  if (!estudiante || !sede || !anio) return null;

  const [niveles, grados, secciones, matriculas] = await Promise.all([
    getNiveles(sede.id),
    getGrados(sede.id),
    getSecciones(anio.id),
    getMatriculasEstudiante(estudiante.id),
  ]);

  const mat = matriculas.find((m) => m.anio_id === anio.id) ?? matriculas[0];
  const seccion = mat ? (secciones.find((s) => s.id === mat.seccion_id) ?? null) : null;
  const grado = seccion
    ? (grados.find((g) => g.id === seccion.grado_id) ?? null)
    : null;
  const nivel = grado
    ? (niveles.find((n) => n.id === grado.nivel_id) ?? null)
    : null;

  return { estudiante, nivel, grado, seccion, sede, anio };
}
