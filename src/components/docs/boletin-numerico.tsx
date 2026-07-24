import { DocumentoShell } from "@/components/docs/documento-shell";
import type { NotaBoletin } from "@/lib/docs/types";
import { NOTA_MINIMA } from "@/lib/grades/types";

interface Asig {
  id: string;
  nombre: string;
}

export function BoletinNumerico({
  folio,
  emitidoEmail,
  titulo,
  estudiante,
  nivel,
  grado,
  seccion,
  asignaturas,
  notas,
}: {
  folio: string;
  emitidoEmail?: string | null;
  titulo: string;
  estudiante: { nombre: string; codigo: string; rne: string | null };
  nivel: string;
  grado: string;
  seccion: string;
  asignaturas: Asig[];
  notas: NotaBoletin[];
}) {
  const notaDe = (asignaturaId: string, orden: number): number | null => {
    const n = notas.find(
      (x) => x.asignatura_id === asignaturaId && x.periodo_orden === orden,
    );
    return n ? n.nota : null;
  };
  const promedio = (asignaturaId: string): number | null => {
    const vals = [1, 2, 3, 4]
      .map((o) => notaDe(asignaturaId, o))
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
  };

  return (
    <DocumentoShell titulo={titulo} folio={folio} emitidoEmail={emitidoEmail}>
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
            <th className="border border-[#0B2E4F] p-1.5 text-left">Asignatura</th>
            <th className="border border-[#0B2E4F] p-1.5">P1</th>
            <th className="border border-[#0B2E4F] p-1.5">P2</th>
            <th className="border border-[#0B2E4F] p-1.5">P3</th>
            <th className="border border-[#0B2E4F] p-1.5">P4</th>
            <th className="border border-[#0B2E4F] p-1.5">Prom.</th>
            <th className="border border-[#0B2E4F] p-1.5">Condición</th>
          </tr>
        </thead>
        <tbody>
          {asignaturas.map((a) => {
            const prom = promedio(a.id);
            const aprob = prom !== null && prom >= NOTA_MINIMA;
            return (
              <tr key={a.id}>
                <td className="border border-[#E2E8F0] p-1.5">{a.nombre}</td>
                {[1, 2, 3, 4].map((o) => {
                  const v = notaDe(a.id, o);
                  return (
                    <td
                      key={o}
                      className="border border-[#E2E8F0] p-1.5 text-center tabular-nums"
                      style={v !== null && v < NOTA_MINIMA ? { color: "#D14343" } : undefined}
                    >
                      {v === null ? "—" : v.toFixed(0)}
                    </td>
                  );
                })}
                <td className="border border-[#E2E8F0] p-1.5 text-center font-semibold tabular-nums">
                  {prom === null ? "—" : prom.toFixed(1)}
                </td>
                <td
                  className="border border-[#E2E8F0] p-1.5 text-center font-semibold"
                  style={{ color: aprob ? "#2E9E6B" : prom === null ? "#5B6B7F" : "#D14343" }}
                >
                  {prom === null ? "—" : aprob ? "Aprobada" : "Reprobada"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-[#5B6B7F]">
        Escala 0–100 · Nota mínima de aprobación: {NOTA_MINIMA}. Calificación
        final = promedio de los cuatro períodos (MINERD).
      </p>

      <div className="mt-12 flex justify-between text-xs">
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
