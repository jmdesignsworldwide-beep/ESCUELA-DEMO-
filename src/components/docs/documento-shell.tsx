import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { COLEGIO } from "@/lib/constants";
import { formatFechaRD } from "@/lib/utils";

/**
 * Marco de documento oficial membretado (imprimible → PDF). Encabezado con
 * identidad del colegio, folio único y pie de verificación.
 */
export function DocumentoShell({
  titulo,
  folio,
  emitidoEmail,
  children,
}: {
  titulo: string;
  folio: string;
  emitidoEmail?: string | null;
  children: ReactNode;
}) {
  return (
    <article className="doc-page mx-auto my-6 w-full max-w-[820px] bg-white px-10 py-8 text-[#0F1D2E] shadow-card print:my-0 print:max-w-none print:shadow-none">
      <header className="flex items-start justify-between border-b-2 border-[#0B2E4F] pb-4">
        <div className="flex items-center gap-3">
          <LogoMark className="h-14 w-14" />
          <div>
            <h1 className="font-serif text-xl font-semibold text-[#0B2E4F]">
              {COLEGIO.nombre}
            </h1>
            <p className="text-xs text-[#5B6B7F]">
              {COLEGIO.ciudad}, {COLEGIO.pais}
            </p>
            <p className="text-xs text-[#5B6B7F]">
              Registro MINERD · Código {COLEGIO.siglas}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded border border-[#C9A227] bg-[#F5E9C8] px-2 py-1">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#0B2E4F]">
              Folio
            </p>
            <p className="font-mono text-sm font-bold text-[#0B2E4F]">{folio}</p>
          </div>
        </div>
      </header>

      <h2 className="mt-6 text-center font-serif text-lg font-semibold uppercase tracking-wide text-[#0B2E4F]">
        {titulo}
      </h2>

      <div className="mt-5 text-sm leading-relaxed">{children}</div>

      <footer className="mt-10 border-t border-[#E2E8F0] pt-3 text-[0.65rem] text-[#5B6B7F]">
        <div className="flex items-center justify-between">
          <span>
            Documento verificable con el folio <strong>{folio}</strong> en el
            sistema JM ESCOLAR.
          </span>
          <span>Emitido: {formatFechaRD(new Date())}</span>
        </div>
        {emitidoEmail && (
          <p className="mt-0.5">Emitido por: {emitidoEmail}</p>
        )}
        <p className="mt-2 text-center italic text-[#94A3B8]">
          Este documento incluye NCF simulado — demostración comercial.
        </p>
      </footer>
    </article>
  );
}
