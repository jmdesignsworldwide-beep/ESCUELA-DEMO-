import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { AdmisionesView } from "./admisiones-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import {
  getAdmisionesResumen,
  getSolicitudes,
} from "@/lib/admisiones/queries";

export const metadata: Metadata = { title: "Admisiones" };
export const dynamic = "force-dynamic";

export default async function AdmisionesPage({
  searchParams,
}: {
  searchParams: { estado?: string };
}) {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "secretaria",
  ]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="Admisiones" description="Admisiones en línea." />
        <EstructuraVacia />
      </div>
    );
  }

  const estado = searchParams.estado ?? "todas";

  const [resumen, solicitudes, niveles, grados, secciones] = await Promise.all([
    getAdmisionesResumen(),
    getSolicitudes(estado),
    getNiveles(sede.id),
    getGrados(sede.id),
    getSecciones(anio.id),
  ]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const seccionOpciones = secciones
    .filter((s) => s.activa)
    .map((s) => {
      const g = gradoPorId.get(s.grado_id);
      const n = g ? nivelPorId.get(g.nivel_id) : undefined;
      return {
        id: s.id,
        label: `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`,
      };
    });

  const puedeMatricular =
    profile.role === "director" || profile.role === "secretaria";

  return (
    <div>
      <PageHeader
        title="Admisiones en línea"
        description={`${sede.nombre} · Embudo de solicitudes de ingreso`}
      />
      <AdmisionesView
        resumen={resumen}
        solicitudes={solicitudes}
        estadoFiltro={estado}
        seccionOpciones={seccionOpciones}
        puedeMatricular={puedeMatricular}
      />
    </div>
  );
}
