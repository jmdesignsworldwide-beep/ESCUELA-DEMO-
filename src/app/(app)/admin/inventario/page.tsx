import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { InventarioView } from "./inventario-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import {
  getInventario,
  getCatalogo,
  getPrestamosActivos,
} from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "Inventario y biblioteca" };

export default async function InventarioPage() {
  const { profile } = await requireRole(["director", "secretaria"]);
  const canWrite = profile.role === "director" || profile.role === "secretaria";

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Inventario y biblioteca" description="Activos y libros." />
        <EstructuraVacia />
      </div>
    );
  }

  const [inventario, catalogo, prestamos, estudiantes] = await Promise.all([
    getInventario(sede.id),
    getCatalogo(),
    getPrestamosActivos(),
    getEstudiantes(sede.id),
  ]);

  const tituloLibro = new Map(catalogo.map((l) => [l.id, l.titulo]));
  const prestamosView = prestamos.map((p) => ({
    id: p.id,
    libro: tituloLibro.get(p.libro_id) ?? "—",
    prestatario: p.prestatario,
    fecha: p.fecha,
    vence: p.vence,
  }));

  return (
    <div>
      <PageHeader
        title="Inventario y biblioteca"
        description={`${sede.nombre} · Activos, insumos y catálogo bibliotecario`}
      />
      <InventarioView
        canWrite={canWrite}
        inventario={inventario}
        catalogo={catalogo}
        prestamos={prestamosView}
        estudiantes={estudiantes.map((e) => ({
          id: e.id,
          nombre: `${e.apellidos}, ${e.nombres}`,
        }))}
      />
    </div>
  );
}
