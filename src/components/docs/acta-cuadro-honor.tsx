import { DocumentoShell } from "@/components/docs/documento-shell";

export function ActaCuadroHonor({
  folio,
  nivel,
  grado,
  seccion,
  umbral,
  filas,
}: {
  folio: string;
  nivel: string;
  grado: string;
  seccion: string;
  umbral: number;
  filas: { puesto: number; nombre: string; promedio: number; asistencia: number }[];
}) {
  return (
    <DocumentoShell titulo="Cuadro de Honor" folio={folio}>
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
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
          <span className="font-semibold">Criterio:</span> promedio ≥ {umbral}
        </p>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-[#334155]">
        La Dirección del centro reconoce a los siguientes estudiantes por su
        excelencia académica y cumplimiento del régimen de asistencia durante el
        año escolar:
      </p>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-1.5">Puesto</th>
            <th className="border border-[#0B2E4F] p-1.5 text-left">Estudiante</th>
            <th className="border border-[#0B2E4F] p-1.5">Promedio</th>
            <th className="border border-[#0B2E4F] p-1.5">Asistencia</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={4} className="border border-[#E2E8F0] p-3 text-center text-[#5B6B7F]">
                Sin estudiantes que alcancen el criterio.
              </td>
            </tr>
          )}
          {filas.map((f) => (
            <tr key={f.nombre}>
              <td className="border border-[#E2E8F0] p-1.5 text-center font-semibold">
                {f.puesto}º
              </td>
              <td className="border border-[#E2E8F0] p-1.5">{f.nombre}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center font-semibold tabular-nums text-[#0B2E4F]">
                {f.promedio.toFixed(1)}
              </td>
              <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">
                {f.asistencia.toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 flex justify-center text-xs">
        <div className="w-56 border-t border-[#0F1D2E] pt-1 text-center">
          Dirección
        </div>
      </div>
    </DocumentoShell>
  );
}
