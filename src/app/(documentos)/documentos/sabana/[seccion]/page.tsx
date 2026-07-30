import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getAsignaturas,
  getPensumSede,
} from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import { getPromediosFinales } from "@/lib/recovery/queries";
import { getSituacionAcademica } from "@/lib/actas/queries";
import { getNivelesNorma } from "@/lib/academic/normas";
import { ActaSabana } from "@/components/docs/acta-sabana";

export const dynamic = "force-dynamic";

export default async function SabanaPage({
  params,
}: {
  params: { seccion: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) notFound();

  const [niveles, grados, secciones, asignaturas, pensum, normas, roster, promedios, situacion] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getAsignaturas(sede.id),
      getPensumSede(sede.id),
      getNivelesNorma(sede.id),
      getEstudiantesDeSeccion(params.seccion, anio.id),
      getPromediosFinales(anio.id, params.seccion),
      getSituacionAcademica(anio.id, params.seccion),
    ]);

  const seccion = secciones.find((s) => s.id === params.seccion);
  const grado = seccion ? grados.find((g) => g.id === seccion.grado_id) : undefined;
  const nivel = grado ? niveles.find((n) => n.id === grado.nivel_id) : undefined;
  if (!seccion || !grado || !nivel) notFound();

  const minAprob =
    normas.find((n) => n.id === nivel.id)?.min_aprobacion ?? null;

  const asignaturasGrado = pensum
    .filter((p) => p.grado_id === grado.id)
    .map((p) => asignaturas.find((a) => a.id === p.asignatura_id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ id: a.id, nombre: a.nombre }));

  return (
    <ActaSabana
      folio={`SAB-${grado.nombre.replace(/[^\w]+/g, "")}-${seccion.nombre}`}
      nivel={nivel.nombre}
      grado={grado.nombre}
      seccion={seccion.nombre}
      minAprob={minAprob}
      asignaturas={asignaturasGrado}
      roster={roster.map((e) => ({
        id: e.id,
        nombre: `${e.apellidos}, ${e.nombres}`,
      }))}
      promedios={promedios}
      situacion={situacion}
    />
  );
}
