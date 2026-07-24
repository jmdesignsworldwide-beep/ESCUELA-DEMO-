import { DocumentoShell } from "@/components/docs/documento-shell";
import {
  ESCALA_INICIAL_LABELS,
  type EscalaInicial,
} from "@/lib/inicial/types";

interface Area {
  id: string;
  nombre: string;
}
interface Indicador {
  id: string;
  area_id: string;
  descripcion: string;
}

export function BoletinInicial({
  folio,
  emitidoEmail,
  estudiante,
  grado,
  seccion,
  areas,
  indicadores,
  valores,
  observacion,
}: {
  folio: string;
  emitidoEmail?: string | null;
  estudiante: { nombre: string; codigo: string };
  grado: string;
  seccion: string;
  areas: Area[];
  indicadores: Indicador[];
  valores: Map<string, EscalaInicial>;
  observacion: string | null;
}) {
  return (
    <DocumentoShell
      titulo="Informe de Evaluación — Nivel Inicial"
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
          <span className="font-semibold">Grado y sección:</span> {grado} “{seccion}”
        </p>
        <p>
          <span className="font-semibold">Año escolar:</span> 2025–2026
        </p>
      </div>

      <p className="mb-3 rounded bg-[#F5E9C8] px-3 py-1.5 text-xs text-[#0B2E4F]">
        Evaluación cualitativa por indicadores de logro. Escala: En proceso ·
        Logrado · Consolidado.
      </p>

      {areas.map((area) => {
        const inds = indicadores.filter((i) => i.area_id === area.id);
        if (inds.length === 0) return null;
        return (
          <div key={area.id} className="mb-3">
            <h3 className="font-serif text-sm font-semibold text-[#0B2E4F]">
              {area.nombre}
            </h3>
            <table className="mt-1 w-full border-collapse text-xs">
              <tbody>
                {inds.map((ind) => (
                  <tr key={ind.id}>
                    <td className="border border-[#E2E8F0] p-1.5">
                      {ind.descripcion}
                    </td>
                    <td className="w-32 border border-[#E2E8F0] p-1.5 text-center font-semibold text-[#0B2E4F]">
                      {valores.has(ind.id)
                        ? ESCALA_INICIAL_LABELS[valores.get(ind.id)!]
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="mt-4">
        <h3 className="font-serif text-sm font-semibold text-[#0B2E4F]">
          Observaciones del docente
        </h3>
        <p className="mt-1 min-h-[3rem] rounded border border-[#E2E8F0] p-2 text-sm">
          {observacion ?? "—"}
        </p>
      </div>

      <div className="mt-10 flex justify-between text-xs">
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Docente de aula
        </div>
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Dirección
        </div>
      </div>
    </DocumentoShell>
  );
}
