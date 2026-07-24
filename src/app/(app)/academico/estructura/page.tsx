import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EstructuraView } from "./estructura-view";
import { EstructuraVacia } from "./estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getPeriodos,
  getNiveles,
  getGrados,
  getJornadas,
  getAulas,
  getAsignaturas,
  getSecciones,
  getPensumSede,
  getEsquemasPonderacion,
  getComponentes,
} from "@/lib/academic/queries";

export const metadata: Metadata = { title: "Estructura académica" };

export default async function EstructuraPage() {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "secretaria",
  ]);
  const canWrite = profile.role === "director" || profile.role === "coordinador";

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);

  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Estructura académica"
          description="Año escolar, períodos, niveles, grados, secciones y pénsum."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [
    periodos,
    niveles,
    grados,
    jornadas,
    aulas,
    asignaturas,
    secciones,
    pensum,
    esquemas,
  ] = await Promise.all([
    getPeriodos(anio.id),
    getNiveles(sede.id),
    getGrados(sede.id),
    getJornadas(sede.id),
    getAulas(sede.id),
    getAsignaturas(sede.id),
    getSecciones(anio.id),
    getPensumSede(sede.id),
    getEsquemasPonderacion(sede.id),
  ]);

  const esquemaActivo = esquemas.find((e) => e.activo) ?? esquemas[0] ?? null;
  const componentes = esquemaActivo
    ? await getComponentes(esquemaActivo.id)
    : [];

  return (
    <div>
      <PageHeader
        title="Estructura académica"
        description={`${sede.nombre} · Configuración del año en curso`}
        actions={<Badge variant="gold">{anio.nombre}</Badge>}
      />
      <EstructuraView
        canWrite={canWrite}
        periodos={periodos}
        niveles={niveles}
        grados={grados}
        jornadas={jornadas}
        aulas={aulas}
        asignaturas={asignaturas}
        secciones={secciones}
        pensum={pensum}
        esquema={esquemaActivo}
        componentes={componentes}
      />
    </div>
  );
}
