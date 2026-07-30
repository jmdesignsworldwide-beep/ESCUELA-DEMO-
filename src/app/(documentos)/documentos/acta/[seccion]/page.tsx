import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require";
import { DocumentoShell } from "@/components/docs/documento-shell";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getAsignaturas,
  getPensumSede,
} from "@/lib/academic/queries";
import { getEstudiantesDeSeccion } from "@/lib/students/queries";
import { getPromediosFinales, getRecuperaciones } from "@/lib/recovery/queries";
import { getSituacionAcademica } from "@/lib/actas/queries";
import { getNivelesNorma } from "@/lib/academic/normas";
import { SITUACION_LABELS, type SituacionAcademica } from "@/lib/actas/types";

export const dynamic = "force-dynamic";

const COLOR: Record<SituacionAcademica, string> = {
  promovido: "#2E9E6B",
  promovido_automatico: "#2E9E6B",
  completivo: "#E0902B",
  reprobado: "#D14343",
  condicion_asistencia: "#D14343",
  evaluacion_cualitativa: "#5B6B7F",
};

export default async function ActaPage({
  params,
}: {
  params: { seccion: string };
}) {
  await requireRole(["director", "coordinador", "secretaria"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) notFound();

  const [niveles, grados, secciones, asignaturas, pensum, normas, roster, promedios, recups, situacion] =
    await Promise.all([
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
      getAsignaturas(sede.id),
      getPensumSede(sede.id),
      getNivelesNorma(sede.id),
      getEstudiantesDeSeccion(params.seccion, anio.id),
      getPromediosFinales(anio.id, params.seccion),
      getRecuperaciones(anio.id, params.seccion),
      getSituacionAcademica(anio.id, params.seccion),
    ]);

  const seccion = secciones.find((s) => s.id === params.seccion);
  const grado = seccion ? grados.find((g) => g.id === seccion.grado_id) : undefined;
  const nivel = grado ? niveles.find((n) => n.id === grado.nivel_id) : undefined;
  if (!seccion || !grado || !nivel) notFound();

  const minAprob = normas.find((n) => n.id === nivel.id)?.min_aprobacion ?? null;

  const asignaturasGrado = pensum
    .filter((p) => p.grado_id === grado.id)
    .map((p) => asignaturas.find((a) => a.id === p.asignatura_id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  const sitDe = (est: string) => situacion.find((s) => s.estudiante_id === est);

  const filas = roster
    .map((e) => {
      // Asignaturas pendientes (< nota mínima del nivel), tras recuperación.
      const pendientes = asignaturasGrado.filter((a) => {
        if (minAprob === null) return false;
        const prom = promedios.find(
          (x) => x.estudiante_id === e.id && x.asignatura_id === a.id,
        )?.promedio;
        const recs = recups.filter(
          (r) => r.estudiante_id === e.id && r.asignatura_id === a.id,
        );
        const mejor = recs.length ? Math.max(...recs.map((r) => r.nota)) : null;
        const final = mejor ?? prom ?? null;
        return final !== null && final < minAprob;
      });
      const s = sitDe(e.id);
      return {
        nombre: `${e.apellidos}, ${e.nombres}`,
        codigo: e.codigo,
        pendientes: pendientes.map((a) => a.nombre),
        asistencia: s ? s.asistencia : null,
        situacion: (s?.situacion ?? "evaluacion_cualitativa") as SituacionAcademica,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const folio = `ACTA-${grado.codigo}-${seccion.nombre}-2026`;

  return (
    <DocumentoShell titulo="Acta Final de Promoción" folio={folio}>
      <p className="mb-4 text-sm">
        <span className="font-semibold">Grado y sección:</span> {grado.nombre} “
        {seccion.nombre}” · <span className="font-semibold">Nivel:</span>{" "}
        {nivel.nombre} · <span className="font-semibold">Año escolar:</span>{" "}
        2025–2026
      </p>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0B2E4F] text-white">
            <th className="border border-[#0B2E4F] p-1.5 text-left">#</th>
            <th className="border border-[#0B2E4F] p-1.5 text-left">Estudiante</th>
            <th className="border border-[#0B2E4F] p-1.5">Matrícula</th>
            <th className="border border-[#0B2E4F] p-1.5">Asist.</th>
            <th className="border border-[#0B2E4F] p-1.5 text-left">Pendientes</th>
            <th className="border border-[#0B2E4F] p-1.5">Situación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.codigo}>
              <td className="border border-[#E2E8F0] p-1.5 text-center">{i + 1}</td>
              <td className="border border-[#E2E8F0] p-1.5">{f.nombre}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center">{f.codigo}</td>
              <td className="border border-[#E2E8F0] p-1.5 text-center tabular-nums">
                {f.asistencia === null ? "—" : `${f.asistencia.toFixed(0)}%`}
              </td>
              <td className="border border-[#E2E8F0] p-1.5">
                {f.pendientes.length === 0 ? "—" : f.pendientes.join(", ")}
              </td>
              <td
                className="border border-[#E2E8F0] p-1.5 text-center font-semibold"
                style={{ color: COLOR[f.situacion] }}
              >
                {SITUACION_LABELS[f.situacion]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[0.7rem] text-[#5B6B7F]">
        Reglas (Ordenanza 04-2023): aprobación por nivel
        {minAprob !== null ? ` (mínimo ${minAprob})` : ""}; hasta 2 asignaturas
        reprobadas → completivo; más de 2 → reprobado, salvo grados sin
        repitencia (promoción automática); asistencia por debajo del mínimo →
        condición por asistencia.
      </p>

      <div className="mt-14 flex justify-between text-xs">
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Coordinación Académica
        </div>
        <div className="w-48 border-t border-[#0F1D2E] pt-1 text-center">
          Dirección General
        </div>
      </div>
    </DocumentoShell>
  );
}
