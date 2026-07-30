import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import { getConfigAcademica } from "@/lib/academic/normas";
import { getAsistenciaSeccionResumen } from "@/lib/attendance/analytics";
import { ActaAsistencia } from "@/components/docs/acta-asistencia";

export const dynamic = "force-dynamic";

export default async function AsistenciaDocPage({
  params,
}: {
  params: { seccion: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) notFound();

  const [niveles, grados, secciones, configAcad, roster, resumen] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getConfigAcademica(sede.id),
      getEstudiantesDeSeccion(params.seccion, anio.id),
      getAsistenciaSeccionResumen(anio.id, params.seccion),
    ]);

  const seccion = secciones.find((s) => s.id === params.seccion);
  const grado = seccion ? grados.find((g) => g.id === seccion.grado_id) : undefined;
  const nivel = grado ? niveles.find((n) => n.id === grado.nivel_id) : undefined;
  if (!seccion || !grado || !nivel) notFound();

  const nombrePorEst = new Map(
    roster.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`]),
  );

  const filas = resumen
    .map((r) => ({
      nombre: nombrePorEst.get(r.estudiante_id) ?? "—",
      dias: r.dias,
      presentes: r.presentes,
      ausencias: r.ausencias,
      tardanzas: r.tardanzas,
      pct: r.pct,
      en_riesgo: r.en_riesgo,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <ActaAsistencia
      folio={`ASI-${grado.nombre.replace(/[^\w]+/g, "")}-${seccion.nombre}`}
      nivel={nivel.nombre}
      grado={grado.nombre}
      seccion={seccion.nombre}
      minimo={configAcad.asistencia_minima}
      filas={filas}
    />
  );
}
