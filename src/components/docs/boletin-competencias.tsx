import { Fragment } from "react";
import { DocumentoShell } from "@/components/docs/documento-shell";
import type {
  BandaDesempeno,
  BoletinAreaRow,
  BoletinDetalleRow,
  BoletinFundamentalRow,
} from "@/lib/competencias/types";

export function BoletinCompetencias({
  folio,
  emitidoEmail,
  estudiante,
  nivel,
  grado,
  seccion,
  periodo,
  areas,
  detalle,
  fundamentales,
  bandas,
}: {
  folio: string;
  emitidoEmail?: string | null;
  estudiante: { nombre: string; codigo: string; rne: string | null };
  nivel: string;
  grado: string;
  seccion: string;
  periodo: string;
  areas: BoletinAreaRow[];
  detalle: BoletinDetalleRow[];
  fundamentales: BoletinFundamentalRow[];
  bandas: BandaDesempeno[];
}) {
  const detallePorArea = new Map<string, BoletinDetalleRow[]>();
  for (const d of detalle) {
    const arr = detallePorArea.get(d.asignatura_id) ?? [];
    arr.push(d);
    detallePorArea.set(d.asignatura_id, arr);
  }

  return (
    <DocumentoShell
      titulo="Informe de Evaluación por Competencias"
      folio={folio}
      emitidoEmail={emitidoEmail}
    >
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="font-semibold">Estudiante:</span> {estudiante.nombre}
        </p>
        <p>
          <span className="font-semibold">Matrícula:</span> {estudiante.codigo}
        </p>
        <p>
          <span className="font-semibold">Nivel:</span> {nivel}
        </p>
        <p>
          <span className="font-semibold">Grado y sección:</span> {grado} “
          {seccion}”
        </p>
        {estudiante.rne && (
          <p>
            <span className="font-semibold">RNE:</span> {estudiante.rne}
          </p>
        )}
        <p>
          <span className="font-semibold">Período:</span> {periodo}
        </p>
      </div>

      {/* Áreas curriculares con sus competencias específicas */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-1.5 text-left">
              Área / Competencia específica
            </th>
            <th className="w-16 border border-[#0B2E4F] p-1.5">Valor</th>
            <th className="w-40 border border-[#0B2E4F] p-1.5">Nivel de dominio</th>
          </tr>
        </thead>
        <tbody>
          {areas.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="border border-[#E2E8F0] p-3 text-center text-[#5B6B7F]"
              >
                Sin competencias registradas para este período.
              </td>
            </tr>
          )}
          {areas.map((a) => {
            const comps = detallePorArea.get(a.asignatura_id) ?? [];
            return (
              <Fragment key={a.asignatura_id}>
                <tr className="bg-[#F1F5F9]">
                  <td className="border border-[#E2E8F0] p-1.5 font-semibold text-[#0B2E4F]">
                    {a.asignatura}
                  </td>
                  <td
                    className="border border-[#E2E8F0] p-1.5 text-center font-bold tabular-nums"
                    style={{ color: a.color ?? "#0F1D2E" }}
                  >
                    {a.nota_area}
                  </td>
                  <td
                    className="border border-[#E2E8F0] p-1.5 text-center font-semibold"
                    style={{ color: a.color ?? "#0F1D2E" }}
                  >
                    {a.banda ?? "—"}
                    {!a.aprobada && (
                      <span className="ml-1 text-[#D14343]">·  reprobada</span>
                    )}
                  </td>
                </tr>
                {comps.map((c) => (
                  <tr key={c.competencia_id}>
                    <td className="border border-[#E2E8F0] py-1 pl-5 pr-1.5 text-[#334155]">
                      {c.competencia}
                    </td>
                    <td className="border border-[#E2E8F0] p-1 text-center tabular-nums">
                      {c.valor}
                    </td>
                    <td
                      className="border border-[#E2E8F0] p-1 text-center"
                      style={{ color: c.color ?? "#5B6B7F" }}
                    >
                      {c.banda ?? "—"}
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Competencias fundamentales (transversales) */}
      {fundamentales.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-[#0B2E4F]">
            Competencias Fundamentales
          </h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#0B2E4F] text-white">
                <th className="border border-[#0B2E4F] p-1.5 text-left">
                  Competencia
                </th>
                <th className="w-16 border border-[#0B2E4F] p-1.5">Promedio</th>
                <th className="w-40 border border-[#0B2E4F] p-1.5">
                  Nivel de dominio
                </th>
              </tr>
            </thead>
            <tbody>
              {fundamentales.map((f) => (
                <tr key={f.competencia_id}>
                  <td className="border border-[#E2E8F0] p-1.5">{f.competencia}</td>
                  <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">
                    {f.promedio}
                  </td>
                  <td
                    className="border border-[#E2E8F0] p-1.5 text-center font-medium"
                    style={{ color: f.color ?? "#5B6B7F" }}
                  >
                    {f.banda ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Leyenda de bandas */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] text-[#5B6B7F]">
        {bandas.map((b) => (
          <span key={b.id} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: b.color }}
            />
            <strong>{b.nombre_corto}</strong> {b.etiqueta} ({b.min_valor}–
            {b.max_valor})
          </span>
        ))}
      </div>

      <p className="mt-3 text-[0.65rem] text-[#5B6B7F]">
        Evaluación por competencias conforme a la Ordenanza 04-2023 (MINERD). La
        nota de cada área resume el desempeño en sus competencias específicas.
      </p>

      <div className="mt-10 flex justify-between text-xs">
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Docente / Tutor de curso
        </div>
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Dirección
        </div>
      </div>
    </DocumentoShell>
  );
}
