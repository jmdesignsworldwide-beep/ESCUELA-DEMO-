import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import { DocumentoShell } from "@/components/docs/documento-shell";
import { PrintButton } from "@/components/docs/print-button";
import { createClient } from "@/lib/supabase/server";
import { getLinea, getNomina } from "@/lib/payroll/queries";
import { getEmpleado } from "@/lib/staff/queries";
import { nombreEmpleado } from "@/lib/staff/types";
import { nombreMes, TIPO_NOMINA_LABELS } from "@/lib/payroll/types";
import { formatRD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VolantePage({
  params,
}: {
  params: { linea: string };
}) {
  await requireRole(["director", "contabilidad"]);

  const linea = await getLinea(params.linea);
  if (!linea) notFound();

  const [nomina, empleado] = await Promise.all([
    getNomina(linea.nomina_id),
    getEmpleado(linea.empleado_id),
  ]);
  if (!nomina || !empleado) notFound();

  // Verifica que ambos pertenezcan a la sede activa del usuario (RLS ya filtra).
  const supabase = createClient();
  const { data: existe } = await supabase
    .from("nomina_lineas")
    .select("id")
    .eq("id", linea.id)
    .maybeSingle<{ id: string }>();
  if (!existe) notFound();

  const ingresos: { label: string; monto: number }[] = [
    { label: "Salario base", monto: linea.salario_base },
  ];
  if (linea.otros_ingresos > 0)
    ingresos.push({ label: "Otros ingresos", monto: linea.otros_ingresos });

  const deducciones: { label: string; monto: number }[] = [];
  if (linea.afp > 0) deducciones.push({ label: "AFP (fondo de pensiones)", monto: linea.afp });
  if (linea.sfs > 0) deducciones.push({ label: "SFS (seguro familiar de salud)", monto: linea.sfs });
  if (linea.isr > 0) deducciones.push({ label: "ISR (retención)", monto: linea.isr });
  if (linea.otras_deducciones > 0)
    deducciones.push({ label: "Otras deducciones", monto: linea.otras_deducciones });

  return (
    <>
      <div className="no-imprimir mx-auto flex max-w-[820px] justify-end px-2 pt-3">
        <PrintButton />
      </div>
      <DocumentoShell
      titulo="Volante de Pago"
      folio={`VOL-${nomina.anio}${String(nomina.mes).padStart(2, "0")}-${empleado.codigo}`}
    >
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <p>
          <span className="text-[#5B6B7F]">Empleado:</span>{" "}
          <strong>{nombreEmpleado(empleado)}</strong>
        </p>
        <p>
          <span className="text-[#5B6B7F]">Cédula:</span>{" "}
          {empleado.cedula ?? "—"}
        </p>
        <p>
          <span className="text-[#5B6B7F]">Cargo:</span> {empleado.cargo}
        </p>
        <p>
          <span className="text-[#5B6B7F]">Período:</span> {nombreMes(nomina.mes)}{" "}
          {nomina.anio} · {TIPO_NOMINA_LABELS[nomina.tipo]}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="mb-1 border-b border-[#E2E8F0] pb-1 text-xs font-semibold uppercase tracking-wide text-[#0B2E4F]">
            Ingresos
          </h3>
          <table className="w-full text-xs">
            <tbody>
              {ingresos.map((i) => (
                <tr key={i.label}>
                  <td className="py-1">{i.label}</td>
                  <td className="py-1 text-right tabular-nums">{formatRD(i.monto)}</td>
                </tr>
              ))}
              <tr className="border-t border-[#E2E8F0] font-semibold">
                <td className="py-1">Total ingresos</td>
                <td className="py-1 text-right tabular-nums">
                  {formatRD(linea.total_ingresos)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-1 border-b border-[#E2E8F0] pb-1 text-xs font-semibold uppercase tracking-wide text-[#0B2E4F]">
            Deducciones
          </h3>
          <table className="w-full text-xs">
            <tbody>
              {deducciones.length === 0 && (
                <tr>
                  <td className="py-1 text-[#5B6B7F]" colSpan={2}>
                    Sin deducciones (exento).
                  </td>
                </tr>
              )}
              {deducciones.map((d) => (
                <tr key={d.label}>
                  <td className="py-1">{d.label}</td>
                  <td className="py-1 text-right tabular-nums">{formatRD(d.monto)}</td>
                </tr>
              ))}
              <tr className="border-t border-[#E2E8F0] font-semibold">
                <td className="py-1">Total deducciones</td>
                <td className="py-1 text-right tabular-nums">
                  {formatRD(linea.total_deducciones)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg bg-[#0B2E4F] px-4 py-3 text-white">
        <span className="text-sm font-medium uppercase tracking-wide">
          Neto a pagar
        </span>
        <span className="font-serif text-xl font-bold tabular-nums">
          {formatRD(linea.neto)}
        </span>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-8 text-xs">
        <div className="border-t border-[#0F1D2E] pt-1 text-center">
          Firma del empleado
        </div>
        <div className="border-t border-[#0F1D2E] pt-1 text-center">
          Administración
        </div>
      </div>
      </DocumentoShell>
    </>
  );
}
