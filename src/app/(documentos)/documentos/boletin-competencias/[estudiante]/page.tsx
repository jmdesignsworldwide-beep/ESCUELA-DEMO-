import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getPeriodos,
} from "@/lib/academic/queries";
import { getEstudiante, getMatriculasAnio } from "@/lib/students/queries";
import {
  getBandasDesempeno,
  getBoletinAreas,
  getBoletinDetalle,
  getBoletinFundamentales,
} from "@/lib/competencias/queries";
import { BoletinCompetencias } from "@/components/docs/boletin-competencias";

export const dynamic = "force-dynamic";

export default async function BoletinCompetenciasPage({
  params,
  searchParams,
}: {
  params: { estudiante: string };
  searchParams: { periodo?: string };
}) {
  await requireRole(["director", "coordinador", "secretaria", "docente"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) notFound();

  const periodoId = searchParams.periodo ?? "";
  if (!periodoId) notFound();

  const [estudiante, niveles, grados, secciones, matriculas, periodos, bandas] =
    await Promise.all([
      getEstudiante(params.estudiante),
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getMatriculasAnio(anio.id),
      getPeriodos(anio.id),
      getBandasDesempeno(sede.id),
    ]);

  if (!estudiante) notFound();

  const matricula = matriculas.find(
    (m) => m.estudiante_id === estudiante.id && m.estado === "activa",
  );
  const seccion = matricula
    ? secciones.find((s) => s.id === matricula.seccion_id)
    : undefined;
  const grado = seccion ? grados.find((g) => g.id === seccion.grado_id) : undefined;
  const nivel = grado ? niveles.find((n) => n.id === grado.nivel_id) : undefined;
  const periodo = periodos.find((p) => p.id === periodoId);

  const [areas, detalle, fundamentales] = await Promise.all([
    getBoletinAreas(estudiante.id, periodoId),
    getBoletinDetalle(estudiante.id, periodoId),
    getBoletinFundamentales(estudiante.id, periodoId),
  ]);

  return (
    <BoletinCompetencias
      folio={`COMP-${estudiante.codigo}`}
      estudiante={{
        nombre: `${estudiante.apellidos}, ${estudiante.nombres}`,
        codigo: estudiante.codigo,
        rne: estudiante.rne,
      }}
      nivel={nivel?.nombre ?? "—"}
      grado={grado?.nombre ?? "—"}
      seccion={seccion?.nombre ?? "—"}
      periodo={periodo?.nombre ?? "—"}
      areas={areas}
      detalle={detalle}
      fundamentales={fundamentales}
      bandas={bandas}
    />
  );
}
