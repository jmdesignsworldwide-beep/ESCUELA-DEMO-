import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { AsistenciaReportesView } from "./asistencia-reportes-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import { getConfigAcademica } from "@/lib/academic/normas";
import {
  getAsistenciaDashboard,
  getAsistenciaTendencia,
  getAsistenciaPorNivel,
  getAsistenciaSeccionResumen,
} from "@/lib/attendance/analytics";

export const metadata: Metadata = { title: "Reportes de asistencia" };
export const dynamic = "force-dynamic";

export default async function AsistenciaReportesPage({
  searchParams,
}: {
  searchParams: { seccion?: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Reportes de asistencia"
          description="Estadística de asistencia."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, configAcad, dashboard, tendencia, porNivel] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getConfigAcademica(sede.id),
      getAsistenciaDashboard(anio.id),
      getAsistenciaTendencia(anio.id),
      getAsistenciaPorNivel(anio.id),
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

  const [roster, resumen] = await Promise.all([
    seccionSel ? getEstudiantesDeSeccion(seccionSel, anio.id) : Promise.resolve([]),
    seccionSel
      ? getAsistenciaSeccionResumen(anio.id, seccionSel)
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
        title="Reportes de asistencia"
        description={`${sede.nombre} · Estadística y semáforo (mínimo ${configAcad.asistencia_minima}%)`}
      />
      <AsistenciaReportesView
        minimo={configAcad.asistencia_minima}
        dashboard={dashboard}
        tendencia={tendencia}
        porNivel={porNivel}
        secciones={seccionesNum.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        seccionSel={seccionSel}
        seccionNombre={seccionSel ? seccionLabel(seccionSel) : ""}
        resumen={resumen.map((r) => ({
          ...r,
          nombre: nombrePorEst.get(r.estudiante_id) ?? "—",
        }))}
      />
    </div>
  );
}
