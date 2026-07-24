import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { RecuperacionView } from "./recuperacion-view";
import { EstructuraVacia } from "../estructura/estructura-vacia";
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
import {
  NOTA_MINIMA,
  estadoPromocion,
  siguienteInstancia,
  type InstanciaRecuperacion,
} from "@/lib/recovery/types";

export const metadata: Metadata = { title: "Recuperación" };

export interface AsignaturaRecup {
  asignaturaId: string;
  nombre: string;
  promedio: number | null;
  final: number | null;
  aprobada: boolean;
  registradas: number;
  siguiente: InstanciaRecuperacion | null;
}
export interface EstudianteRecup {
  id: string;
  nombre: string;
  asignaturas: AsignaturaRecup[];
  reprobadas: number;
  estado: "promovido" | "condicionado" | "repite";
}

export default async function RecuperacionPage({
  searchParams,
}: {
  searchParams: { seccion?: string };
}) {
  await requireRole(["director", "coordinador"]);

  const [sede, anio] = await Promise.all([getSedeActiva(), getAnioActivo()]);
  if (!sede || !anio) {
    return (
      <div>
        <PageHeader title="Recuperación" description="Completivo, extraordinario y especial." />
        <EstructuraVacia />
      </div>
    );
  }

  const [niveles, grados, secciones, asignaturas, pensum] = await Promise.all([
    getNiveles(sede.id),
    getGrados(sede.id),
    getSecciones(anio.id),
    getAsignaturas(sede.id),
    getPensumSede(sede.id),
  ]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const asignaturaPorId = new Map(asignaturas.map((a) => [a.id, a]));

  const seccionesNum = secciones
    .filter((s) => {
      const g = gradoPorId.get(s.grado_id);
      const n = g ? nivelPorId.get(g.nivel_id) : undefined;
      return n?.tipo_evaluacion === "numerica";
    })
    .sort((a, b) => {
      const na = nivelPorId.get(gradoPorId.get(a.grado_id)?.nivel_id ?? "")?.orden ?? 0;
      const nb = nivelPorId.get(gradoPorId.get(b.grado_id)?.nivel_id ?? "")?.orden ?? 0;
      return na - nb;
    });

  const seccionSel = searchParams.seccion ?? seccionesNum[0]?.id ?? "";
  const seccion = secciones.find((s) => s.id === seccionSel);
  const grado = seccion ? gradoPorId.get(seccion.grado_id) : undefined;

  const asignaturasGrado = grado
    ? pensum
        .filter((p) => p.grado_id === grado.id)
        .map((p) => asignaturaPorId.get(p.asignatura_id))
        .filter((a): a is NonNullable<typeof a> => !!a)
    : [];

  const [roster, promedios, recuperaciones] = seccionSel
    ? await Promise.all([
        getEstudiantesDeSeccion(seccionSel, anio.id),
        getPromediosFinales(anio.id, seccionSel),
        getRecuperaciones(anio.id, seccionSel),
      ])
    : [[], [], []];

  const promedioDe = (est: string, asg: string): number | null => {
    const p = promedios.find(
      (x) => x.estudiante_id === est && x.asignatura_id === asg,
    );
    return p ? p.promedio : null;
  };
  const recupsDe = (est: string, asg: string) =>
    recuperaciones.filter(
      (r) => r.estudiante_id === est && r.asignatura_id === asg,
    );

  const estudiantes: EstudianteRecup[] = roster.map((e) => {
    const asigs: AsignaturaRecup[] = asignaturasGrado.map((a) => {
      const prom = promedioDe(e.id, a.id);
      const recs = recupsDe(e.id, a.id);
      const mejorRecup = recs.length
        ? Math.max(...recs.map((r) => r.nota))
        : null;
      const final =
        mejorRecup !== null
          ? mejorRecup
          : prom;
      return {
        asignaturaId: a.id,
        nombre: a.nombre,
        promedio: prom,
        final,
        aprobada: final !== null && final >= NOTA_MINIMA,
        registradas: recs.length,
        siguiente: siguienteInstancia(recs.length),
      };
    });
    const reprobadas = asigs.filter(
      (x) => x.final !== null && x.final < NOTA_MINIMA,
    ).length;
    return {
      id: e.id,
      nombre: `${e.apellidos}, ${e.nombres}`,
      asignaturas: asigs,
      reprobadas,
      estado: estadoPromocion(reprobadas),
    };
  });

  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Recuperación"
        description="Completivo · Extraordinario · Especial — tope de nota 70."
        actions={
          seccionSel ? (
            <Button asChild variant="gold" size="sm" className="gap-1.5">
              <Link href={`/documentos/acta/${seccionSel}`} target="_blank">
                <FileText className="h-4 w-4" />
                Acta de promoción
              </Link>
            </Button>
          ) : undefined
        }
      />
      <RecuperacionView
        secciones={seccionesNum.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))}
        seccionSel={seccionSel}
        estudiantes={estudiantes}
      />
    </div>
  );
}
