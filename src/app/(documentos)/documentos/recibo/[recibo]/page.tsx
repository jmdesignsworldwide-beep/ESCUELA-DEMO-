import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import { DocumentoShell } from "@/components/docs/documento-shell";
import {
  getPagoPorRecibo,
  getAplicaciones,
} from "@/lib/cashier/queries";
import { getEstudiante } from "@/lib/students/queries";
import { METODO_LABELS } from "@/lib/cashier/types";
import { formatRD, formatFechaRD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReciboPage({
  params,
}: {
  params: { recibo: string };
}) {
  await requireRole(["director", "contabilidad"]);

  const recibo = decodeURIComponent(params.recibo);
  const pago = await getPagoPorRecibo(recibo);
  if (!pago) notFound();

  const [aplicaciones, estudiante] = await Promise.all([
    getAplicaciones(pago.id),
    pago.estudiante_id
      ? getEstudiante(pago.estudiante_id)
      : Promise.resolve(null),
  ]);

  return (
    <DocumentoShell
      titulo="Recibo de Pago"
      folio={pago.recibo}
      emitidoEmail={pago.cajero_email}
    >
      {pago.anulado && (
        <p className="mb-3 rounded border border-[#D14343] bg-[#D14343]/10 px-3 py-1.5 text-center text-sm font-bold uppercase text-[#D14343]">
          Recibo anulado por nota de crédito
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="font-semibold">Recibido de:</span>{" "}
          {estudiante ? `${estudiante.nombres} ${estudiante.apellidos}` : "—"}
        </p>
        <p>
          <span className="font-semibold">Matrícula:</span>{" "}
          {estudiante?.codigo ?? "—"}
        </p>
        <p>
          <span className="font-semibold">Fecha:</span>{" "}
          {formatFechaRD(pago.fecha)}
        </p>
        <p>
          <span className="font-semibold">Método:</span>{" "}
          {METODO_LABELS[pago.metodo]}
          {pago.referencia ? ` · Ref. ${pago.referencia}` : ""}
        </p>
        <p className="col-span-2">
          <span className="font-semibold">NCF:</span>{" "}
          <span className="font-mono">{pago.ncf}</span>{" "}
          <span className="rounded bg-[#F5E9C8] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-[#0B2E4F]">
            Simulado (demo)
          </span>
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-2 text-left">Concepto</th>
            <th className="border border-[#0B2E4F] p-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {aplicaciones.map((a, i) => (
            <tr key={i}>
              <td className="border border-[#E2E8F0] p-2">{a.descripcion}</td>
              <td className="border border-[#E2E8F0] p-2 text-right tabular-nums">
                {formatRD(a.monto)}
              </td>
            </tr>
          ))}
          <tr className="bg-[#F7F9FC] font-bold">
            <td className="border border-[#E2E8F0] p-2 text-right">Total</td>
            <td className="border border-[#E2E8F0] p-2 text-right tabular-nums">
              {formatRD(pago.monto)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-14 flex justify-between text-xs">
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Cajero(a)
        </div>
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Recibí conforme
        </div>
      </div>
    </DocumentoShell>
  );
}
