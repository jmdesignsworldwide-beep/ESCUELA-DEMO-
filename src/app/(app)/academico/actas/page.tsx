import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { ActasView } from "./actas-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
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
import {
  getSituacionAcademica,
  getPromediosAsignatura,
  getCuadroHonor,
  getPromediosResumen,
} from "@/lib/actas/queries";
import { getNivelesNorma } from "@/lib/academic/normas";

export const metadata: Metadata = { title: "Actas y promedios" };
export const dynamic = "force-dynamic";

export default async function ActasPage({
  searchParams,
}: {
  searchParams: { seccion?: string; umbral?: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Actas y promedios"
          description="Sábana, promedios y cuadro de honor."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, asignaturas, pensum, normas, resumen] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getAsignaturas(sede.id),
      getPensumSede(sede.id),
      getNivelesNorma(sede.id),
      getPromediosResumen(anio.id),
    ]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const minPorNivel = new Map(normas.map((n) => [n.id, n.min_aprobacion]));

  // Sólo secciones numéricas (Primaria/Secundaria) para la sábana.
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
  const umbral = Number(searchParams.umbral ?? 85);
  const seccion = secciones.find((s) => s.id === seccionSel);
  const grado = seccion ? gradoPorId.get(seccion.grado_id) : undefined;
  const nivel = grado ? nivelPorId.get(grado.nivel_id) : undefined;
  const minAprob = nivel ? (minPorNivel.get(nivel.id) ?? null) : null;

  const asignaturasSeccion = grado
    ? pensum
        .filter((p) => p.grado_id === grado.id)
        .map((p) => asignaturas.find((a) => a.id === p.asignatura_id))
        .filter((a): a is NonNullable<typeof a> => !!a)
    : [];

  const [roster, promedios, situacion, promAsig, cuadro] = await Promise.all([
    seccionSel ? getEstudiantesDeSeccion(seccionSel, anio.id) : Promise.resolve([]),
    seccionSel ? getPromediosFinales(anio.id, seccionSel) : Promise.resolve([]),
    seccionSel ? getSituacionAcademica(anio.id, seccionSel) : Promise.resolve([]),
    seccionSel ? getPromediosAsignatura(anio.id, seccionSel) : Promise.resolve([]),
    seccionSel
      ? getCuadroHonor(anio.id, seccionSel, umbral)
      : Promise.resolve([]),
  ]);

  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };

  const nombrePorEst = new Map(
    roster.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`]),
  );

  return (
    <div>
      <PageHeader
        title="Actas y promedios"
        description={`${sede.nombre} · Sábana, promedios y cuadro de honor`}
      />
      <ActasView
        secciones={seccionesNum.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        seccionSel={seccionSel}
        seccionNombre={seccion ? seccionLabel(seccion.id) : ""}
        umbral={umbral}
        minAprob={minAprob}
        asignaturas={asignaturasSeccion.map((a) => ({ id: a.id, nombre: a.nombre }))}
        roster={roster.map((e) => ({
          id: e.id,
          nombre: nombrePorEst.get(e.id) ?? "",
        }))}
        promedios={promedios}
        situacion={situacion}
        promAsig={promAsig}
        cuadro={cuadro.map((c) => ({
          ...c,
          nombre: nombrePorEst.get(c.estudiante_id) ?? "—",
        }))}
        resumen={resumen}
      />
    </div>
  );
}
