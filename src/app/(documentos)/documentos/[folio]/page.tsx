import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import { armarContexto } from "@/lib/docs/context";
import { getDocumentoPorFolio, getBoletinNumerico } from "@/lib/docs/queries";
import {
  getAsignaturas,
  getPensumSede,
  getPeriodos,
} from "@/lib/academic/queries";
import {
  getAreas,
  getIndicadores,
  getEvaluacionesEstudiante,
  getObservacion,
} from "@/lib/inicial/queries";
import { BoletinNumerico } from "@/components/docs/boletin-numerico";
import { BoletinInicial } from "@/components/docs/boletin-inicial";
import { Oficio } from "@/components/docs/oficio";
import { TIPO_DOC_LABELS } from "@/lib/docs/types";
import type { EscalaInicial } from "@/lib/inicial/types";

export const dynamic = "force-dynamic";

export default async function DocumentoPage({
  params,
}: {
  params: { folio: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const folio = decodeURIComponent(params.folio);
  const doc = await getDocumentoPorFolio(folio);
  if (!doc || !doc.estudiante_id) notFound();

  const ctx = await armarContexto(doc.estudiante_id);
  if (!ctx) notFound();

  const nombre = `${ctx.estudiante.nombres} ${ctx.estudiante.apellidos}`;
  const est = {
    nombre,
    codigo: ctx.estudiante.codigo,
    rne: ctx.estudiante.rne,
  };
  const nivelNombre = ctx.nivel?.nombre ?? "—";
  const gradoNombre = ctx.grado?.nombre ?? "—";
  const seccionNombre = ctx.seccion?.nombre ?? "—";

  // Documentos narrativos.
  if (
    doc.tipo === "certificacion" ||
    doc.tipo === "constancia_inscripcion" ||
    doc.tipo === "buena_conducta"
  ) {
    return (
      <Oficio
        tipo={doc.tipo}
        folio={doc.folio}
        emitidoEmail={doc.emitido_email}
        estudiante={est}
        nivel={nivelNombre}
        grado={gradoNombre}
        seccion={seccionNombre}
      />
    );
  }

  // Boletín / récord: cualitativo (Inicial) o numérico.
  if (ctx.nivel?.tipo_evaluacion === "cualitativa") {
    const periodos = await getPeriodos(ctx.anio.id);
    const periodoId =
      doc.periodo_id ??
      (periodos.find((p) => p.estado === "en_curso") ?? periodos[0])?.id ??
      "";
    const [areas, indicadores, evals, obs] = await Promise.all([
      getAreas(ctx.sede.id),
      getIndicadores(ctx.sede.id),
      periodoId
        ? getEvaluacionesEstudiante(ctx.estudiante.id, periodoId)
        : Promise.resolve([]),
      periodoId
        ? getObservacion(ctx.estudiante.id, periodoId)
        : Promise.resolve(null),
    ]);
    const valores = new Map<string, EscalaInicial>(
      evals.map((e) => [e.indicador_id, e.valor]),
    );
    return (
      <BoletinInicial
        folio={doc.folio}
        emitidoEmail={doc.emitido_email}
        estudiante={{ nombre, codigo: ctx.estudiante.codigo }}
        grado={gradoNombre}
        seccion={seccionNombre}
        areas={areas.map((a) => ({ id: a.id, nombre: a.nombre }))}
        indicadores={indicadores.map((i) => ({
          id: i.id,
          area_id: i.area_id,
          descripcion: i.descripcion,
        }))}
        valores={valores}
        observacion={obs?.texto ?? null}
      />
    );
  }

  const [asignaturas, pensum, notas] = await Promise.all([
    getAsignaturas(ctx.sede.id),
    getPensumSede(ctx.sede.id),
    getBoletinNumerico(ctx.estudiante.id, ctx.anio.id),
  ]);
  const asignaturasGrado = ctx.grado
    ? pensum
        .filter((p) => p.grado_id === ctx.grado!.id)
        .map((p) => asignaturas.find((a) => a.id === p.asignatura_id))
        .filter((a): a is NonNullable<typeof a> => !!a)
        .map((a) => ({ id: a.id, nombre: a.nombre }))
    : [];

  return (
    <BoletinNumerico
      folio={doc.folio}
      emitidoEmail={doc.emitido_email}
      titulo={TIPO_DOC_LABELS[doc.tipo]}
      estudiante={est}
      nivel={nivelNombre}
      grado={gradoNombre}
      seccion={seccionNombre}
      asignaturas={asignaturasGrado}
      notas={notas}
    />
  );
}
