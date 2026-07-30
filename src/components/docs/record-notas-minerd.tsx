import { DocumentoShell } from "@/components/docs/documento-shell";
import type { NotaBoletin } from "@/lib/docs/types";

interface Asig {
  id: string;
  nombre: string;
}

/** Récord de notas en formato MINERD (transcripción oficial del año). */
export function RecordNotasMinerd({
  folio,
  emitidoEmail,
  estudiante,
  nivel,
  grado,
  seccion,
  minAprob,
  asignaturas,
  notas,
}: {
  folio: string;
  emitidoEmail?: string | null;
  estudiante: { nombre: string; codigo: string; rne: string | null };
  nivel: string;
  grado: string;
  seccion: string;
  minAprob: number;
  asignaturas: Asig[];
  notas: NotaBoletin[];
}) {
  const notaDe = (asignaturaId: string, orden: number): number | null => {
    const n = notas.find(
      (x) => x.asignatura_id === asignaturaId && x.periodo_orden === orden,
    );
    return n ? n.nota : null;
  };
  const final = (asignaturaId: string): number | null => {
    const vals = [1, 2, 3, 4]
      .map((o) => notaDe(asignaturaId, o))
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };

  const finales = asignaturas
    .map((a) => final(a.id))
    .filter((v): v is number => v !== null);
  const promedioGeneral =
    finales.length > 0
      ? Math.round((finales.reduce((s, v) => s + v, 0) / finales.length) * 10) / 10
      : null;
  const reprobadas = asignaturas.filter((a) => {
    const f = final(a.id);
    return f !== null && f < minAprob;
  }).length;
  const situacion =
    reprobadas === 0 ? "Promovido(a)" : reprobadas <= 2 ? "Completivo" : "Reprobado(a)";
  const situacionColor =
    reprobadas === 0 ? "#2E9E6B" : reprobadas <= 2 ? "#E0902B" : "#D14343";

  return (
    <DocumentoShell
      titulo="Récord de Notas (MINERD)"
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
          <span className="font-semibold">Grado y sección:</span> {grado} “{seccion}”
        </p>
        {estudiante.rne && (
          <p>
            <span className="font-semibold">RNE:</span> {estudiante.rne}
          </p>
        )}
        <p>
          <span className="font-semibold">Año escolar:</span> 2025–2026
        </p>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-1.5 text-left">
              Asignatura / Área
            </th>
            <th className="border border-[#0B2E4F] p-1.5">1er P.</th>
            <th className="border border-[#0B2E4F] p-1.5">2do P.</th>
            <th className="border border-[#0B2E4F] p-1.5">3er P.</th>
            <th className="border border-[#0B2E4F] p-1.5">4to P.</th>
            <th className="border border-[#0B2E4F] p-1.5">Calif. final</th>
            <th className="border border-[#0B2E4F] p-1.5">Condición</th>
          </tr>
        </thead>
        <tbody>
          {asignaturas.map((a) => {
            const f = final(a.id);
            const aprob = f !== null && f >= minAprob;
            return (
              <tr key={a.id}>
                <td className="border border-[#E2E8F0] p-1.5">{a.nombre}</td>
                {[1, 2, 3, 4].map((o) => {
                  const v = notaDe(a.id, o);
                  return (
                    <td
                      key={o}
                      className="border border-[#E2E8F0] p-1.5 text-center tabular-nums"
                      style={v !== null && v < minAprob ? { color: "#D14343" } : undefined}
                    >
                      {v === null ? "—" : v.toFixed(0)}
                    </td>
                  );
                })}
                <td className="border border-[#E2E8F0] p-1.5 text-center font-semibold tabular-nums">
                  {f === null ? "—" : f}
                </td>
                <td
                  className="border border-[#E2E8F0] p-1.5 text-center font-semibold"
                  style={{ color: aprob ? "#2E9E6B" : f === null ? "#5B6B7F" : "#D14343" }}
                >
                  {f === null ? "—" : aprob ? "Aprobada" : "Reprobada"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#F1F5F9] font-semibold">
            <td className="border border-[#E2E8F0] p-1.5" colSpan={5}>
              Promedio general del año
            </td>
            <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums text-[#0B2E4F]">
              {promedioGeneral === null ? "—" : promedioGeneral.toFixed(1)}
            </td>
            <td
              className="border border-[#E2E8F0] p-1.5 text-center"
              style={{ color: situacionColor }}
            >
              {situacion}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-4 text-xs text-[#5B6B7F]">
        Escala 0–100 · Nota mínima de aprobación del nivel: {minAprob}.
        Calificación final = promedio de los cuatro períodos. Situación conforme
        a la Ordenanza 04-2023 (MINERD).
      </p>

      <div className="mt-12 flex justify-between text-xs">
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Secretaría docente
        </div>
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Dirección General
        </div>
      </div>
    </DocumentoShell>
  );
}
