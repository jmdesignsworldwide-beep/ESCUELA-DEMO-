import { DocumentoShell } from "@/components/docs/documento-shell";

export function ActaAsistencia({
  folio,
  nivel,
  grado,
  seccion,
  minimo,
  filas,
}: {
  folio: string;
  nivel: string;
  grado: string;
  seccion: string;
  minimo: number;
  filas: {
    nombre: string;
    dias: number;
    presentes: number;
    ausencias: number;
    tardanzas: number;
    pct: number;
    en_riesgo: boolean;
  }[];
}) {
  const enRiesgo = filas.filter((f) => f.en_riesgo).length;
  return (
    <DocumentoShell titulo="Reporte de Asistencia" folio={folio}>
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
          <span className="font-semibold">Asistencia mínima:</span> {minimo}%
        </p>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-1.5 text-left">Estudiante</th>
            <th className="border border-[#0B2E4F] p-1.5">Días</th>
            <th className="border border-[#0B2E4F] p-1.5">Pres.</th>
            <th className="border border-[#0B2E4F] p-1.5">Aus.</th>
            <th className="border border-[#0B2E4F] p-1.5">Tard.</th>
            <th className="border border-[#0B2E4F] p-1.5">%</th>
            <th className="border border-[#0B2E4F] p-1.5">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre}>
              <td className="border border-[#E2E8F0] p-1.5">{f.nombre}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">{f.dias}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">{f.presentes}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">{f.ausencias}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">{f.tardanzas}</td>
              <td
                className="border border-[#E2E8F0] p-1.5 text-center font-semibold tabular-nums"
                style={{ color: f.en_riesgo ? "#D14343" : "#2E9E6B" }}
              >
                {f.pct.toFixed(1)}
              </td>
              <td
                className="border border-[#E2E8F0] p-1.5 text-center font-semibold"
                style={{ color: f.en_riesgo ? "#D14343" : "#2E9E6B" }}
              >
                {f.en_riesgo ? "En riesgo" : "En regla"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[0.7rem] text-[#5B6B7F]">
        {enRiesgo} estudiante(s) por debajo del {minimo}% de asistencia (Ord.
        04-2023). % = (presente + tardanza + excusa) / días registrados.
      </p>

      <div className="mt-12 flex justify-between text-xs">
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
