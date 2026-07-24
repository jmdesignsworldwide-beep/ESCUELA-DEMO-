import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import { DocumentoShell } from "@/components/docs/documento-shell";
import { WhatsAppButton } from "@/components/docs/whatsapp-button";
import { createClient } from "@/lib/supabase/server";
import { getSedeActiva } from "@/lib/academic/queries";
import { getEstudiantes, getTutoresDeEstudiante } from "@/lib/students/queries";
import { getCargosFamilia } from "@/lib/finance/queries";
import { formatRD, formatFechaRD } from "@/lib/utils";
import { COLEGIO } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CobroPage({
  params,
}: {
  params: { familia: string };
}) {
  await requireRole(["director", "contabilidad"]);

  const sede = await getSedeActiva();
  if (!sede) notFound();

  const supabase = createClient();
  const { data: familia } = await supabase
    .from("familias")
    .select("apellido_familiar")
    .eq("id", params.familia)
    .maybeSingle<{ apellido_familiar: string }>();
  if (!familia) notFound();

  const [cargos, estudiantes] = await Promise.all([
    getCargosFamilia(params.familia),
    getEstudiantes(sede.id),
  ]);
  const nombreEst = new Map(
    estudiantes.map((e) => [e.id, `${e.nombres} ${e.apellidos}`]),
  );
  const estudiantesFamilia = estudiantes.filter(
    (e) => e.familia_id === params.familia,
  );

  const pendientes = cargos.filter(
    (c) => c.estado === "pendiente" || c.estado === "parcial",
  );
  const total = pendientes.reduce((s, c) => s + c.monto, 0);

  // Teléfono del tutor principal (del primer estudiante de la familia).
  let telefono: string | null = null;
  if (estudiantesFamilia[0]) {
    const tutores = await getTutoresDeEstudiante(estudiantesFamilia[0].id);
    const principal = tutores.find((t) => t.principal) ?? tutores[0];
    telefono = principal?.tutor?.telefono ?? null;
  }

  const mensaje =
    `Estimada familia ${familia.apellido_familiar}, le saludamos del ${COLEGIO.nombre}. ` +
    `Le recordamos que mantiene un saldo pendiente de ${formatRD(total)}. ` +
    `Agradecemos ponerse al día para evitar recargos por mora. ¡Gracias!`;

  return (
    <>
      <div className="no-imprimir mx-auto max-w-[820px] px-2 pt-3">
        <WhatsAppButton telefono={telefono} mensaje={mensaje} />
      </div>
      <DocumentoShell
        titulo="Comunicación de Cobro"
        folio={`COB-${familia.apellido_familiar.slice(0, 3).toUpperCase()}-2026`}
      >
        <p className="mb-4 text-sm">
          {formatFechaRD(new Date())}
        </p>
        <p className="mb-4 text-sm">
          Estimada <strong>familia {familia.apellido_familiar}</strong>:
        </p>
        <p className="text-justify leading-7">
          Le saludamos cordialmente desde la administración del{" "}
          {COLEGIO.nombre}. Por este medio le recordamos que a la fecha mantiene
          un <strong>saldo pendiente</strong> con la institución, según el
          siguiente detalle:
        </p>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#0B2E4F] text-white">
              <th className="border border-[#0B2E4F] p-2 text-left">Estudiante</th>
              <th className="border border-[#0B2E4F] p-2 text-left">Concepto</th>
              <th className="border border-[#0B2E4F] p-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((c) => (
              <tr key={c.id}>
                <td className="border border-[#E2E8F0] p-2">
                  {nombreEst.get(c.estudiante_id) ?? "—"}
                </td>
                <td className="border border-[#E2E8F0] p-2">{c.descripcion}</td>
                <td className="border border-[#E2E8F0] p-2 text-right tabular-nums">
                  {formatRD(c.monto)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#F7F9FC] font-bold">
              <td className="border border-[#E2E8F0] p-2 text-right" colSpan={2}>
                Total pendiente
              </td>
              <td className="border border-[#E2E8F0] p-2 text-right tabular-nums">
                {formatRD(total)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-justify leading-7">
          Le agradecemos regularizar su situación a la mayor brevedad para
          evitar la aplicación de recargos por mora. Para cualquier acuerdo de
          pago, puede comunicarse con la oficina de administración.
        </p>

        <div className="mt-12 flex justify-center text-xs">
          <div className="w-56 border-t border-[#0F1D2E] pt-1 text-center">
            Administración · {COLEGIO.nombre}
          </div>
        </div>
      </DocumentoShell>
    </>
  );
}
