import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { InicialView } from "./inicial-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getPeriodos,
} from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import {
  getAreas,
  getIndicadores,
  getEvaluacionesEstudiante,
  getObservacion,
} from "@/lib/inicial/queries";

export const metadata: Metadata = { title: "Nivel Inicial" };

export default async function InicialPage({
  searchParams,
}: {
  searchParams: { seccion?: string; periodo?: string; estudiante?: string };
}) {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "docente",
  ]);
  const canWrite =
    profile.role === "director" ||
    profile.role === "coordinador" ||
    profile.role === "docente";

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="Nivel Inicial" description="Evaluación cualitativa." />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, periodos, areas, indicadores] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getPeriodos(anio.id),
      getAreas(sede.id),
      getIndicadores(sede.id),
    ]);

  const nivelInicial = niveles.find((n) => n.tipo_evaluacion === "cualitativa");
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const seccionesInicial = secciones
    .filter((s) => {
      const g = gradoPorId.get(s.grado_id);
      return g && g.nivel_id === nivelInicial?.id;
    })
    .sort((a, b) => {
      const ga = gradoPorId.get(a.grado_id);
      const gb = gradoPorId.get(b.grado_id);
      return (ga?.orden ?? 0) - (gb?.orden ?? 0);
    });

  const seccionSel = searchParams.seccion ?? seccionesInicial[0]?.id ?? "";
  const periodoActivo =
    periodos.find((p) => p.estado === "en_curso") ?? periodos[0];
  const periodoSel = searchParams.periodo ?? periodoActivo?.id ?? "";

  const roster = seccionSel
    ? await getEstudiantesDeSeccion(seccionSel, anio.id)
    : [];
  const estudianteSel = searchParams.estudiante ?? roster[0]?.id ?? "";

  const [evaluaciones, observacion] = await Promise.all([
    estudianteSel && periodoSel
      ? getEvaluacionesEstudiante(estudianteSel, periodoSel)
      : Promise.resolve([]),
    estudianteSel && periodoSel
      ? getObservacion(estudianteSel, periodoSel)
      : Promise.resolve(null),
  ]);

  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    return `${g?.nombre ?? ""} "${s.nombre}"`;
  };

  return (
    <div>
      <PageHeader
        title="Nivel Inicial"
        description="Evaluación cualitativa por indicadores de logro — sin nota numérica."
        actions={<Badge variant="gold">Boletín cálido</Badge>}
      />
      <InicialView
        canWrite={canWrite}
        secciones={seccionesInicial.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        periodos={periodos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        roster={roster.map((e) => ({
          id: e.id,
          nombre: `${e.nombres} ${e.apellidos}`,
        }))}
        areas={areas.map((a) => ({ id: a.id, nombre: a.nombre, codigo: a.codigo }))}
        indicadores={indicadores.map((i) => ({
          id: i.id,
          area_id: i.area_id,
          descripcion: i.descripcion,
        }))}
        seccionSel={seccionSel}
        periodoSel={periodoSel}
        estudianteSel={estudianteSel}
        evaluaciones={evaluaciones.map((e) => ({
          indicador_id: e.indicador_id,
          valor: e.valor,
        }))}
        observacion={observacion?.texto ?? ""}
      />
    </div>
  );
}
