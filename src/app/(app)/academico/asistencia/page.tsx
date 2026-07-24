import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { AsistenciaView } from "./asistencia-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import {
  getEstudiantesDeSeccion,
  getEstudiantes,
} from "@/lib/students/queries";
import {
  getSesionDiaria,
  getRegistros,
  getResumenAsistencia,
  getAusentismo,
} from "@/lib/attendance/queries";

export const metadata: Metadata = { title: "Asistencia" };

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: { seccion?: string; fecha?: string };
}) {
  await requireRole(["director", "coordinador", "docente"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="Asistencia" description="Pase de lista y reportes." />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, resumen, ausentismo, estudiantes] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getResumenAsistencia(anio.id),
      getAusentismo(anio.id, 3),
      getEstudiantes(sede.id),
    ]);
  const nombreEst = new Map(
    estudiantes.map((e) => [e.id, `${e.nombres} ${e.apellidos}`]),
  );

  const seccionesOrden = [...secciones].sort((a, b) => {
    const ga = grados.find((g) => g.id === a.grado_id);
    const gb = grados.find((g) => g.id === b.grado_id);
    const na = ga ? (niveles.find((n) => n.id === ga.nivel_id)?.orden ?? 0) : 0;
    const nb = gb ? (niveles.find((n) => n.id === gb.nivel_id)?.orden ?? 0) : 0;
    return na - nb || (ga?.orden ?? 0) - (gb?.orden ?? 0);
  });

  const seccionSel = searchParams.seccion ?? seccionesOrden[0]?.id ?? "";
  const fecha = searchParams.fecha ?? hoyISO();

  const [roster, sesion] = await Promise.all([
    seccionSel
      ? getEstudiantesDeSeccion(seccionSel, anio.id)
      : Promise.resolve([]),
    seccionSel ? getSesionDiaria(seccionSel, fecha) : Promise.resolve(null),
  ]);
  const registros = sesion ? await getRegistros(sesion.id) : [];

  // Mapas para etiquetas.
  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = grados.find((x) => x.id === s.grado_id);
    const n = g ? niveles.find((x) => x.id === g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Asistencia"
        description={`${sede.nombre} · ${anio.nombre}`}
      />
      <AsistenciaView
        secciones={seccionesOrden.map((s) => ({
          id: s.id,
          label: seccionLabel(s.id),
        }))}
        seccionSel={seccionSel}
        fecha={fecha}
        roster={roster.map((e) => ({
          id: e.id,
          nombre: `${e.apellidos}, ${e.nombres}`,
        }))}
        registros={registros.map((r) => ({
          estudiante_id: r.estudiante_id,
          estado: r.estado,
        }))}
        cerrada={sesion?.cerrada ?? false}
        resumen={resumen.map((r) => ({ ...r, label: seccionLabel(r.seccion_id) }))}
        ausentismo={ausentismo.map((a) => ({
          ...a,
          nombre: nombreEst.get(a.estudiante_id) ?? "—",
        }))}
      />
    </div>
  );
}
