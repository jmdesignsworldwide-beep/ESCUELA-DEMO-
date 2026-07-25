import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import { DocumentoShell } from "@/components/docs/documento-shell";
import { PrintButton } from "@/components/docs/print-button";
import { WhatsAppButton } from "@/components/docs/whatsapp-button";
import { getCircular, getDestinatarios } from "@/lib/comms/queries";
import { TIPO_CIRCULAR_LABELS, AUDIENCIA_LABELS } from "@/lib/comms/types";
import { formatFechaRD } from "@/lib/utils";
import { COLEGIO } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CircularPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const circular = await getCircular(params.id);
  if (!circular || !circular.publicada) notFound();

  const destinatarios = await getDestinatarios(circular.id);
  const conTelefono = destinatarios.filter((d) => d.telefono);
  const mensaje = `${COLEGIO.nombre} — ${circular.titulo}. ${circular.cuerpo}`;

  return (
    <>
      <div className="no-imprimir mx-auto flex max-w-[820px] items-center justify-between px-2 pt-3">
        <span className="text-sm text-muted-foreground">
          {conTelefono.length} destinatario(s) con teléfono ·{" "}
          {AUDIENCIA_LABELS[circular.audiencia]}
        </span>
        <PrintButton />
      </div>

      <DocumentoShell titulo={TIPO_CIRCULAR_LABELS[circular.tipo]} folio={circular.folio ?? "—"}>
        <p className="mb-4 text-sm">
          {circular.publicada_at
            ? formatFechaRD(new Date(circular.publicada_at))
            : formatFechaRD(new Date())}
        </p>
        <h3 className="mb-3 font-serif text-lg font-semibold text-[#0B2E4F]">
          {circular.titulo}
        </h3>
        <p className="whitespace-pre-line text-justify leading-7">
          {circular.cuerpo}
        </p>
        <div className="mt-10 flex justify-end text-xs">
          <div className="w-56 border-t border-[#0F1D2E] pt-1 text-center">
            Dirección · {COLEGIO.nombre}
          </div>
        </div>
      </DocumentoShell>

      {/* Envío por WhatsApp — no se imprime */}
      <div className="no-imprimir mx-auto mt-4 max-w-[820px] px-2 pb-10">
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-1 font-medium">Enviar por WhatsApp</h4>
          <p className="mb-3 text-sm text-muted-foreground">
            Destinatarios según la audiencia de la circular. El mensaje se
            precarga; tú confirmas el envío en WhatsApp.
          </p>
          {conTelefono.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay destinatarios con teléfono registrado para esta audiencia.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {conTelefono.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.tutor}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.estudiante} · {d.telefono}
                    </p>
                  </div>
                  <WhatsAppButton telefono={d.telefono} mensaje={mensaje} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
