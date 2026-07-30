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
import { getCuadroHonor } from "@/lib/actas/queries";
import { ActaCuadroHonor } from "@/components/docs/acta-cuadro-honor";

export const dynamic = "force-dynamic";

export default async function CuadroHonorPage({
  params,
  searchParams,
}: {
  params: { seccion: string };
  searchParams: { umbral?: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) notFound();

  const umbral = Number(searchParams.umbral ?? 85);

  const [niveles, grados, secciones, roster, cuadro] = await Promise.all([
    getNiveles(sede.id),
    getGrados(sede.id),
    getSecciones(anio.id),
    getEstudiantesDeSeccion(params.seccion, anio.id),
    getCuadroHonor(anio.id, params.seccion, umbral),
  ]);

  const seccion = secciones.find((s) => s.id === params.seccion);
  const grado = seccion ? grados.find((g) => g.id === seccion.grado_id) : undefined;
  const nivel = grado ? niveles.find((n) => n.id === grado.nivel_id) : undefined;
  if (!seccion || !grado || !nivel) notFound();

  const nombrePorEst = new Map(
    roster.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`]),
  );

  return (
    <ActaCuadroHonor
      folio={`CH-${grado.nombre.replace(/[^\w]+/g, "")}-${seccion.nombre}`}
      nivel={nivel.nombre}
      grado={grado.nombre}
      seccion={seccion.nombre}
      umbral={umbral}
      filas={cuadro.map((c) => ({
        puesto: c.puesto,
        nombre: nombrePorEst.get(c.estudiante_id) ?? "—",
        promedio: c.promedio_general,
        asistencia: c.asistencia,
      }))}
    />
  );
}
