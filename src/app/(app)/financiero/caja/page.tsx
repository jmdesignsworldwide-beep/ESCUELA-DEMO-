import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { CajaView } from "./caja-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEstudiantes } from "@/lib/students/queries";
import {
  getCargosSaldo,
  getPagosDelDia,
  getCierre,
  getEstadoSecuenciasNcf,
} from "@/lib/cashier/queries";
import { SecuenciasNcfCard } from "./secuencias-ncf-card";

export const metadata: Metadata = { title: "Caja y cobros" };

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function CajaPage({
  searchParams,
}: {
  searchParams: { estudiante?: string; fecha?: string };
}) {
  const { profile } = await requireRole([
    "director",
    "contabilidad",
    "coordinador",
  ]);
  const canWrite = profile.role === "director" || profile.role === "contabilidad";

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Caja y cobros" description="Registro de pagos." />
        <EstructuraVacia />
      </div>
    );
  }

  const fecha = searchParams.fecha ?? hoyISO();
  const [estudiantes, pagosDia, cierre, secuencias] = await Promise.all([
    getEstudiantes(sede.id),
    getPagosDelDia(fecha),
    getCierre(fecha),
    getEstadoSecuenciasNcf(),
  ]);

  const nombreEst = new Map(
    estudiantes.map((e) => [e.id, `${e.apellidos}, ${e.nombres}`]),
  );
  const familiaEst = new Map(estudiantes.map((e) => [e.id, e.familia_id]));

  const estudianteSel = searchParams.estudiante ?? "";
  const cargos = estudianteSel ? await getCargosSaldo(estudianteSel) : [];

  return (
    <div>
      <PageHeader
        title="Caja y cobros"
        description={`${sede.nombre} · Recibos con NCF / e-CF`}
      />
      <CajaView
        canWrite={canWrite}
        fecha={fecha}
        estudiantes={estudiantes
          .filter((e) => e.estado === "activo")
          .map((e) => ({ id: e.id, nombre: `${e.apellidos}, ${e.nombres}` }))}
        estudianteSel={estudianteSel}
        familiaSel={estudianteSel ? (familiaEst.get(estudianteSel) ?? null) : null}
        cargos={cargos}
        pagosDia={pagosDia.map((p) => ({
          id: p.id,
          recibo: p.recibo,
          ncf: p.ncf,
          estudiante: p.estudiante_id
            ? (nombreEst.get(p.estudiante_id) ?? "—")
            : "—",
          metodo: p.metodo,
          monto: p.monto,
          anulado: p.anulado ?? false,
        }))}
        cierre={cierre}
      />
      <SecuenciasNcfCard secuencias={secuencias} />
    </div>
  );
}
