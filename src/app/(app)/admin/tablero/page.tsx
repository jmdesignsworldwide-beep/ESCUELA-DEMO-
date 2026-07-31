import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { TableroView } from "./tablero-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import {
  getTableroEjecutivo,
  getAlertasEjecutivas,
} from "@/lib/tablero/queries";

export const metadata: Metadata = { title: "Tablero ejecutivo" };
export const dynamic = "force-dynamic";

export default async function TableroPage() {
  await requireRole(["director", "coordinador"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Tablero ejecutivo"
          description="Mirador de dirección."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [tablero, alertas] = await Promise.all([
    getTableroEjecutivo(anio.id),
    getAlertasEjecutivas(anio.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Tablero ejecutivo"
        description={`${sede.nombre} · ${anio.nombre} · Salud institucional en un vistazo`}
      />
      {tablero ? (
        <TableroView tablero={tablero} alertas={alertas} />
      ) : (
        <EstructuraVacia />
      )}
    </div>
  );
}
