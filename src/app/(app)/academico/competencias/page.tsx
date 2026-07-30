import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { LibroCompetenciasView } from "./libro-competencias-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getAsignaturas,
  getPensumSede,
  getPeriodos,
} from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import { getCierre } from "@/lib/grades/queries";
import {
  getBandasDesempeno,
  getCompetenciasEspecificas,
  getCompetenciasFundamentales,
  getLibroCompetencias,
} from "@/lib/competencias/queries";

export const metadata: Metadata = { title: "Competencias" };

export default async function CompetenciasPage({
  searchParams,
}: {
  searchParams: { seccion?: string; asignatura?: string; periodo?: string };
}) {
  const { profile } = await requireRole(["director", "coordinador", "docente"]);
  const canCerrar = profile.role === "director" || profile.role === "coordinador";
  const isDirector = profile.role === "director";

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Competencias"
          description="Libro por competencias."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, asignaturas, pensum, periodos, fundamentales, bandas] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getAsignaturas(sede.id),
      getPensumSede(sede.id),
      getPeriodos(anio.id),
      getCompetenciasFundamentales(sede.id),
      getBandasDesempeno(sede.id),
    ]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const seccionesNum = secciones
    .filter((s) => {
      const g = gradoPorId.get(s.grado_id);
      const n = g ? nivelPorId.get(g.nivel_id) : undefined;
      return n?.tipo_evaluacion === "numerica";
    })
    .sort((a, b) => {
      const ga = gradoPorId.get(a.grado_id);
      const gb = gradoPorId.get(b.grado_id);
      const na = ga ? (nivelPorId.get(ga.nivel_id)?.orden ?? 0) : 0;
      const nb = gb ? (nivelPorId.get(gb.nivel_id)?.orden ?? 0) : 0;
      return na - nb || (ga?.orden ?? 0) - (gb?.orden ?? 0);
    });

  const seccionSel = searchParams.seccion ?? seccionesNum[0]?.id ?? "";
  const seccion = secciones.find((s) => s.id === seccionSel);
  const grado = seccion ? gradoPorId.get(seccion.grado_id) : undefined;

  const asignaturasSeccion = grado
    ? pensum
        .filter((p) => p.grado_id === grado.id)
        .map((p) => asignaturas.find((a) => a.id === p.asignatura_id))
        .filter((a): a is NonNullable<typeof a> => !!a)
    : [];

  const asignaturaSel =
    searchParams.asignatura &&
    asignaturasSeccion.some((a) => a.id === searchParams.asignatura)
      ? searchParams.asignatura
      : (asignaturasSeccion[0]?.id ?? "");

  const periodoActivo =
    periodos.find((p) => p.estado === "en_curso") ?? periodos[0];
  const periodoSel = searchParams.periodo ?? periodoActivo?.id ?? "";

  const [roster, especificas, libro, cierre] = await Promise.all([
    seccionSel ? getEstudiantesDeSeccion(seccionSel, anio.id) : Promise.resolve([]),
    asignaturaSel ? getCompetenciasEspecificas(asignaturaSel) : Promise.resolve([]),
    seccionSel && asignaturaSel && periodoSel
      ? getLibroCompetencias(seccionSel, asignaturaSel, periodoSel)
      : Promise.resolve([]),
    seccionSel && asignaturaSel && periodoSel
      ? getCierre(seccionSel, asignaturaSel, periodoSel)
      : Promise.resolve(null),
  ]);

  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Competencias"
        description={`${sede.nombre} · Libro por competencias (Ordenanza 04-2023)`}
      />
      <LibroCompetenciasView
        canCerrar={canCerrar}
        isDirector={isDirector}
        secciones={seccionesNum.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        asignaturas={asignaturasSeccion.map((a) => ({ id: a.id, nombre: a.nombre }))}
        periodos={periodos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          estado: p.estado,
        }))}
        seccionSel={seccionSel}
        asignaturaSel={asignaturaSel}
        periodoSel={periodoSel}
        fundamentales={fundamentales.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
        }))}
        especificas={especificas.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
        }))}
        bandas={bandas}
        roster={roster.map((e) => ({
          id: e.id,
          nombre: `${e.apellidos}, ${e.nombres}`,
        }))}
        libro={libro.map((l) => ({
          id: l.id,
          estudiante_id: l.estudiante_id,
          fundamental_id: l.fundamental_id,
          especifica_id: l.especifica_id,
          valor: l.valor,
        }))}
        cerrado={cierre?.cerrado ?? false}
      />
    </div>
  );
}
