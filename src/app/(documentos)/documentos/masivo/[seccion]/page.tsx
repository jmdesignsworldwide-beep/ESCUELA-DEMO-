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
import { getBoletinNumerico } from "@/lib/docs/queries";
import {
  getAreas,
  getIndicadores,
  getEvaluacionesEstudiante,
  getObservacion,
} from "@/lib/inicial/queries";
import { BoletinNumerico } from "@/components/docs/boletin-numerico";
import { BoletinInicial } from "@/components/docs/boletin-inicial";
import type { EscalaInicial } from "@/lib/inicial/types";

export const dynamic = "force-dynamic";

export default async function MasivoPage({
  params,
  searchParams,
}: {
  params: { seccion: string };
  searchParams: { periodo?: string; folio?: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) notFound();

  const [niveles, grados, secciones, roster] = await Promise.all([
    getNiveles(sede.id),
    getGrados(sede.id),
    getSecciones(anio.id),
    getEstudiantesDeSeccion(params.seccion, anio.id),
  ]);

  const seccion = secciones.find((s) => s.id === params.seccion);
  const grado = seccion ? grados.find((g) => g.id === seccion.grado_id) : undefined;
  const nivel = grado ? niveles.find((n) => n.id === grado.nivel_id) : undefined;
  if (!seccion || !grado || !nivel) notFound();

  const folioBase = searchParams.folio ?? "LOTE";
  const periodoId = searchParams.periodo ?? "";
  const esInicial = nivel.tipo_evaluacion === "cualitativa";

  // Datos compartidos según nivel.
  const [asignaturas, pensum, areas, indicadores] = await Promise.all([
    esInicial ? Promise.resolve([]) : getAsignaturas(sede.id),
    esInicial ? Promise.resolve([]) : getPensumSede(sede.id),
    esInicial ? getAreas(sede.id) : Promise.resolve([]),
    esInicial ? getIndicadores(sede.id) : Promise.resolve([]),
  ]);

  const asignaturasGrado = esInicial
    ? []
    : pensum
        .filter((p) => p.grado_id === grado.id)
        .map((p) => asignaturas.find((a) => a.id === p.asignatura_id))
        .filter((a): a is NonNullable<typeof a> => !!a)
        .map((a) => ({ id: a.id, nombre: a.nombre }));

  const boletines = await Promise.all(
    roster.map(async (e, i) => {
      const folio = `${folioBase}-${String(i + 1).padStart(3, "0")}`;
      const nombre = `${e.nombres} ${e.apellidos}`;
      if (esInicial) {
        const [evals, obs] = await Promise.all([
          periodoId
            ? getEvaluacionesEstudiante(e.id, periodoId)
            : Promise.resolve([]),
          periodoId ? getObservacion(e.id, periodoId) : Promise.resolve(null),
        ]);
        const valores = new Map<string, EscalaInicial>(
          evals.map((ev) => [ev.indicador_id, ev.valor]),
        );
        return (
          <div key={e.id} className="break-after-page">
            <BoletinInicial
              folio={folio}
              estudiante={{ nombre, codigo: e.codigo }}
              grado={grado.nombre}
              seccion={seccion.nombre}
              areas={areas.map((a) => ({ id: a.id, nombre: a.nombre }))}
              indicadores={indicadores.map((ind) => ({
                id: ind.id,
                area_id: ind.area_id,
                descripcion: ind.descripcion,
              }))}
              valores={valores}
              observacion={obs?.texto ?? null}
            />
          </div>
        );
      }
      const notas = await getBoletinNumerico(e.id, anio.id);
      return (
        <div key={e.id} className="break-after-page">
          <BoletinNumerico
            folio={folio}
            titulo="Boletín de Calificaciones"
            estudiante={{ nombre, codigo: e.codigo, rne: e.rne }}
            nivel={nivel.nombre}
            grado={grado.nombre}
            seccion={seccion.nombre}
            asignaturas={asignaturasGrado}
            notas={notas}
          />
        </div>
      );
    }),
  );

  return (
    <div>
      <div className="mx-auto max-w-[820px] px-2 py-3 text-sm text-muted-foreground print:hidden">
        Lote <strong>{folioBase}</strong> · {roster.length} boletines de{" "}
        {grado.nombre} “{seccion.nombre}”. Usa Imprimir para guardar el PDF
        completo.
      </div>
      {boletines}
    </div>
  );
}
