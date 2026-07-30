import { formatRD, formatFechaRD } from "@/lib/utils";

/**
 * Bloque de Comprobante Fiscal (NCF / e-CF) dominicano, respaldado por una
 * secuencia autorizada por la DGII. Educación = servicio EXENTO de ITBIS.
 */
export function ComprobanteFiscal({
  ncf,
  tipoDescripcion,
  electronico,
  vencimientoSecuencia,
  rncEmisor,
  razonSocial,
  receptor,
  fecha,
  monto,
  codigoSeguridad,
}: {
  ncf: string;
  tipoDescripcion: string;
  electronico: boolean;
  vencimientoSecuencia: string | null;
  rncEmisor: string | null;
  razonSocial: string;
  receptor: string;
  fecha: string;
  monto: number;
  codigoSeguridad: string;
}) {
  return (
    <div className="mt-4 rounded-md border border-[#C9A227] bg-[#FBF6E6] p-3 text-xs text-[#0F1D2E]">
      <div className="mb-2 flex items-center justify-between border-b border-[#E4D08A] pb-1.5">
        <span className="font-serif text-sm font-semibold text-[#0B2E4F]">
          {electronico
            ? "Comprobante Fiscal Electrónico (e-CF)"
            : "Comprobante Fiscal (NCF)"}
        </span>
        <span className="rounded bg-[#0B2E4F] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-white">
          {electronico ? "e-CF" : "NCF"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <p>
          <span className="font-semibold">NCF:</span>{" "}
          <span className="font-mono">{ncf}</span>
        </p>
        <p>
          <span className="font-semibold">Tipo:</span> {tipoDescripcion}
        </p>
        <p>
          <span className="font-semibold">RNC emisor:</span> {rncEmisor ?? "—"}
        </p>
        <p>
          <span className="font-semibold">Razón social:</span> {razonSocial}
        </p>
        <p>
          <span className="font-semibold">Receptor:</span> {receptor}
        </p>
        <p>
          <span className="font-semibold">Fecha de emisión:</span>{" "}
          {formatFechaRD(fecha)}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 border-t border-[#E4D08A] pt-1.5">
        <p>
          <span className="font-semibold">Monto gravado (18%):</span>{" "}
          {formatRD(0)}
        </p>
        <p>
          <span className="font-semibold">Monto exento:</span> {formatRD(monto)}
        </p>
        <p>
          <span className="font-semibold">ITBIS (18%):</span> {formatRD(0)}
        </p>
        <p>
          <span className="font-semibold">Total:</span>{" "}
          <span className="font-semibold">{formatRD(monto)}</span>
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-[#E4D08A] pt-1.5 text-[0.65rem] text-[#5B6B7F]">
        <span>
          Código de seguridad:{" "}
          <span className="font-mono font-semibold">{codigoSeguridad}</span>
        </span>
        {vencimientoSecuencia && (
          <span>Secuencia autorizada válida hasta {formatFechaRD(vencimientoSecuencia)}</span>
        )}
      </div>
      <p className="mt-1 text-[0.6rem] italic text-[#94A3B8]">
        Servicio educativo exento de ITBIS (Ley 11-92, Art. 344). Comprobante
        fiscal simulado — demostración comercial.
      </p>
    </div>
  );
}
