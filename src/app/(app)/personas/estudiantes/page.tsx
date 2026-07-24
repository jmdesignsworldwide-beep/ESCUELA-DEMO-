import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EstudiantesLista, type EstudianteRow } from "./estudiantes-lista";
import { EstructuraVacia } from "../../academico/estructura/estructura-vacia";
import { getSedeActiva, getAnioActivo } from "@/lib/academic/queries";
import {
  getNiveles,
  getGrados,
  getSecciones,
} from "@/lib/academic/queries";
import { getEstudiantes, getMatriculasAnio } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Estudiantes" };

export default async function EstudiantesPage() {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "secretaria",
  ]);
  const canWrite = profile.role === "director" || profile.role === "secretaria";

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader
          title="Estudiantes"
          description="Matrícula y expediente del estudiante."
        />
        <EstructuraVacia />
      </div>
    );
  }

  const [estudiantes, matriculas, niveles, grados, secciones] =
    await Promise.all([
      getEstudiantes(sede.id),
      getMatriculasAnio(anio.id),
      getNiveles(sede.id),
      getGrados(sede.id),
      getSecciones(anio.id),
    ]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const seccionPorId = new Map(secciones.map((s) => [s.id, s]));
  const matriculaPorEst = new Map(matriculas.map((m) => [m.estudiante_id, m]));

  const rows: EstudianteRow[] = estudiantes.map((e) => {
    const mat = matriculaPorEst.get(e.id);
    const sec = mat ? seccionPorId.get(mat.seccion_id) : undefined;
    const grado = sec ? gradoPorId.get(sec.grado_id) : undefined;
    const nivel = grado ? nivelPorId.get(grado.nivel_id) : undefined;
    return {
      id: e.id,
      codigo: e.codigo,
      nombres: e.nombres,
      apellidos: e.apellidos,
      sexo: e.sexo,
      estado: e.estado,
      fecha_nacimiento: e.fecha_nacimiento,
      rne: e.rne,
      seccionLabel: grado && sec ? `${grado.nombre} "${sec.nombre}"` : "—",
      nivelNombre: nivel?.nombre ?? "—",
      nivelOrden: nivel?.orden ?? 99,
    };
  });

  return (
    <div>
      <PageHeader
        title="Estudiantes"
        description={`${sede.nombre} · Matrícula ${anio.nombre}`}
        actions={<Badge variant="gold">{rows.length} estudiantes</Badge>}
      />
      <EstudiantesLista
        rows={rows}
        niveles={niveles}
        grados={grados}
        secciones={secciones}
        canWrite={canWrite}
      />
    </div>
  );
}
