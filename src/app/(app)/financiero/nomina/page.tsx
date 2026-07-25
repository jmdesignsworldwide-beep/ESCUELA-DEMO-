import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { NominaView } from "./nomina-view";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEmpleados } from "@/lib/staff/queries";
import {
  getConfigNomina,
  getNominas,
  getLineas,
  getResumenNomina,
} from "@/lib/payroll/queries";
import { nombreEmpleado } from "@/lib/staff/types";

export const metadata: Metadata = { title: "Nómina docente" };

export default async function NominaPage({
  searchParams,
}: {
  searchParams: { n?: string };
}) {
  const { profile } = await requireRole(["director", "contabilidad"]);
  const canWrite = profile.role === "director" || profile.role === "contabilidad";

  const sede = await getSedeActiva();
  if (!sede) {
    return (
      <div>
        <PageHeader title="Nómina docente" description="TSS, ISR y volantes." />
        <EstructuraVacia />
      </div>
    );
  }

  const [config, nominas, empleados] = await Promise.all([
    getConfigNomina(sede.id),
    getNominas(sede.id),
    getEmpleados(sede.id),
  ]);

  const nombres = Object.fromEntries(
    empleados.map((e) => [e.id, nombreEmpleado(e)]),
  );
  const cargos = Object.fromEntries(empleados.map((e) => [e.id, e.cargo]));

  const selId = searchParams.n ?? nominas[0]?.id ?? null;
  const seleccionada = nominas.find((n) => n.id === selId) ?? null;
  const [lineas, resumen] = seleccionada
    ? await Promise.all([
        getLineas(seleccionada.id),
        getResumenNomina(seleccionada.id),
      ])
    : [[], null];

  return (
    <div>
      <PageHeader
        title="Nómina docente"
        description={`${sede.nombre} · TSS (AFP/SFS), ISR y volantes de pago`}
      />
      <NominaView
        canWrite={canWrite}
        anioActual={2026}
        config={config}
        nominas={nominas}
        seleccionada={seleccionada}
        lineas={lineas}
        resumen={resumen}
        nombres={nombres}
        cargos={cargos}
      />
    </div>
  );
}
