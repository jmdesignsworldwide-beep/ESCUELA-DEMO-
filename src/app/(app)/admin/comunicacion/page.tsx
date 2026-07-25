import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { ComunicacionView } from "./comunicacion-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import { getCirculares } from "@/lib/comms/queries";

export const metadata: Metadata = { title: "Comunicación" };

export default async function ComunicacionPage() {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "secretaria",
  ]);
  const canWrite =
    profile.role === "director" ||
    profile.role === "coordinador" ||
    profile.role === "secretaria";

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Comunicación" description="Circulares y avisos." />
        <EstructuraVacia />
      </div>
    );
  }

  const anio = await getAnioActivo();
  const [circulares, niveles, grados, secciones] = await Promise.all([
    getCirculares(sede.id),
    getNiveles(sede.id),
    getGrados(sede.id),
    anio ? getSecciones(anio.id) : Promise.resolve([]),
  ]);

  const gradoNombre = new Map(grados.map((g) => [g.id, g.nombre]));
  const seccionesOpts = secciones.map((s) => ({
    id: s.id,
    label: `${gradoNombre.get(s.grado_id) ?? ""} ${s.nombre}`.trim(),
  }));

  return (
    <div>
      <PageHeader
        title="Comunicación"
        description={`${sede.nombre} · Circulares, avisos y mensajería`}
      />
      <ComunicacionView
        canWrite={canWrite}
        circulares={circulares}
        niveles={niveles.map((n) => ({ id: n.id, label: n.nombre }))}
        secciones={seccionesOpts}
      />
    </div>
  );
}
