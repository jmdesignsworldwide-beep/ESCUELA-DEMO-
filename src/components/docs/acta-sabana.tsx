import { DocumentoShell } from "@/components/docs/documento-shell";
import {
  SITUACION_LABELS,
  type SituacionRow,
} from "@/lib/actas/types";

interface Asig {
  id: string;
  nombre: string;
}

export function ActaSabana({
  folio,
  nivel,
  grado,
  seccion,
  minAprob,
  asignaturas,
  roster,
  promedios,
  situacion,
}: {
  folio: string;
  nivel: string;
  grado: string;
  seccion: string;
  minAprob: number | null;
  asignaturas: Asig[];
  roster: { id: string; nombre: string }[];
  promedios: { estudiante_id: string; asignatura_id: string; promedio: number }[];
  situacion: SituacionRow[];
}) {
  const notaDe = (est: string, asig: string): number | null =>
    promedios.find((p) => p.estudiante_id === est && p.asignatura_id === asig)
      ?.promedio ?? null;
  const sitDe = (est: string) => situacion.find((s) => s.estudiante_id === est);
  const c = (v: number | null) =>
    v !== null && minAprob !== null && v < minAprob ? { color: "#D14343" } : undefined;

  return (
    <DocumentoShell titulo="Acta General de Calificaciones (Sábana)" folio={folio}>
      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="font-semibold">Nivel:</span> {nivel}
        </p>
        <p>
          <span className="font-semibold">Grado y sección:</span> {grado} “{seccion}”
        </p>
        <p>
          <span className="font-semibold">Año escolar:</span> 2025–2026
        </p>
        <p>
          <span className="font-semibold">Nota mínima de aprobación:</span>{" "}
          {minAprob ?? "—"}
        </p>
      </div>

      <table className="w-full border-collapse text-[0.6rem]">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-1 text-left">Estudiante</th>
            {asignaturas.map((a) => (
              <th
                key={a.id}
                className="border border-[#0B2E4F] p-1"
                title={a.nombre}
              >
                {a.nombre
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 4)}
              </th>
            ))}
            <th className="border border-[#0B2E4F] p-1">Prom.</th>
            <th className="border border-[#0B2E4F] p-1">Situación</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((e) => {
            const s = sitDe(e.id);
            return (
              <tr key={e.id}>
                <td className="border border-[#E2E8F0] p-1">{e.nombre}</td>
                {asignaturas.map((a) => {
                  const v = notaDe(e.id, a.id);
                  return (
                    <td
                      key={a.id}
                      className="border border-[#E2E8F0] p-1 text-center tabular-nums"
                      style={c(v)}
                    >
                      {v === null ? "—" : v.toFixed(0)}
                    </td>
                  );
                })}
                <td
                  className="border border-[#E2E8F0] p-1 text-center font-semibold tabular-nums"
                  style={c(s?.promedio_general ?? null)}
                >
                  {s?.promedio_general?.toFixed(1) ?? "—"}
                </td>
                <td className="border border-[#E2E8F0] p-1 text-center">
                  {s ? SITUACION_LABELS[s.situacion] : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-[0.6rem] text-[#5B6B7F]">
        Las siglas encabezan cada asignatura. Calificación final = promedio de
        los períodos (MINERD). Situación conforme a la Ordenanza 04-2023.
      </p>

      <div className="mt-10 flex justify-between text-xs">
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Secretaría docente
        </div>
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Dirección
        </div>
      </div>
    </DocumentoShell>
  );
}
