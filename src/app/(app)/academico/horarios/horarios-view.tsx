"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Printer, Trash2, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgregarBloqueDialog } from "./agregar-bloque-dialog";
import { quitarBloqueAction, type ActionState } from "./actions";
import { PERIODOS, DIAS, hhmm, type HorarioBloque } from "@/lib/schedule/types";
import type {
  Grado,
  Nivel,
  Seccion,
  Asignatura,
  Aula,
} from "@/lib/academic/types";
import type { DocenteSeccion, Empleado } from "@/lib/staff/types";
import { cn } from "@/lib/utils";

type Modo = "seccion" | "docente" | "aula";

export function HorariosView({
  canWrite,
  horarios,
  niveles,
  grados,
  secciones,
  asignaturas,
  aulas,
  empleados,
  asignaciones,
}: {
  canWrite: boolean;
  horarios: HorarioBloque[];
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
  asignaturas: Asignatura[];
  aulas: Aula[];
  empleados: Empleado[];
  asignaciones: DocenteSeccion[];
}) {
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const asignaturaPorId = new Map(asignaturas.map((a) => [a.id, a]));
  const empleadoPorId = new Map(empleados.map((e) => [e.id, e]));
  const aulaNombre = new Map(aulas.map((a) => [a.id, a.nombre]));

  const seccionLabel = (id: string): string => {
    const s = secciones.find((x) => x.id === id);
    if (!s) return "—";
    const g = gradoPorId.get(s.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${g?.nombre ?? ""} "${s.nombre}" · ${n?.nombre ?? ""}`;
  };
  const empleadoLabel = (id: string): string => {
    const e = empleadoPorId.get(id);
    return e ? `${e.nombres} ${e.apellidos}` : "—";
  };
  const asignaturaLabel = (id: string): string =>
    asignaturaPorId.get(id)?.nombre ?? "—";

  const seccionesOrden = [...secciones].sort((a, b) => {
    const ga = gradoPorId.get(a.grado_id);
    const gb = gradoPorId.get(b.grado_id);
    const na = ga ? (nivelPorId.get(ga.nivel_id)?.orden ?? 0) : 0;
    const nb = gb ? (nivelPorId.get(gb.nivel_id)?.orden ?? 0) : 0;
    return na - nb || (ga?.orden ?? 0) - (gb?.orden ?? 0);
  });
  const docentes = empleados.filter((e) => e.tipo === "docente");
  const aulasIds = Array.from(
    new Set(horarios.map((h) => h.aula_id).filter((x): x is string => !!x)),
  );

  const [modo, setModo] = React.useState<Modo>("seccion");
  const primerConHorario =
    seccionesOrden.find((s) => horarios.some((h) => h.seccion_id === s.id))?.id ??
    seccionesOrden[0]?.id ??
    "";
  const [entidad, setEntidad] = React.useState<string>(primerConHorario);

  // Al cambiar de modo, elegir una entidad válida por defecto.
  const opciones =
    modo === "seccion"
      ? seccionesOrden.map((s) => ({ id: s.id, label: seccionLabel(s.id) }))
      : modo === "docente"
        ? docentes.map((e) => ({ id: e.id, label: empleadoLabel(e.id) }))
        : aulasIds.map((id) => ({ id, label: aulaNombre.get(id) ?? "Aula" }));

  React.useEffect(() => {
    const first = opciones[0]?.id ?? "";
    setEntidad((cur) => (opciones.some((o) => o.id === cur) ? cur : first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  const bloquesEntidad = horarios.filter((h) =>
    modo === "seccion"
      ? h.seccion_id === entidad
      : modo === "docente"
        ? h.empleado_id === entidad
        : h.aula_id === entidad,
  );

  const bloqueEn = (dia: number, periodoInicio: string): HorarioBloque | undefined =>
    bloquesEntidad.find(
      (b) => b.dia_semana === dia && hhmm(b.hora_inicio) === periodoInicio,
    );

  const seccionSel = secciones.find((s) => s.id === entidad);
  const asignacionesSeccion = asignaciones.filter(
    (a) => a.seccion_id === entidad,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="space-y-1.5">
            <Label className="text-xs">Ver por</Label>
            <Select value={modo} onValueChange={(v) => setModo(v as Modo)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seccion">Sección</SelectItem>
                <SelectItem value="docente">Docente</SelectItem>
                <SelectItem value="aula">Aula</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {modo === "seccion"
                ? "Sección"
                : modo === "docente"
                  ? "Docente"
                  : "Aula"}
            </Label>
            <Select value={entidad} onValueChange={setEntidad}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {opciones.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite && modo === "seccion" && seccionSel && (
            <AgregarBloqueDialog
              seccionId={seccionSel.id}
              aulaId={seccionSel.aula_id}
              asignaciones={asignacionesSeccion}
              asignaturaLabel={asignaturaLabel}
              empleadoLabel={empleadoLabel}
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      <Card id="print-horario">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {opciones.find((o) => o.id === entidad)?.label ?? "Horario"}
            </CardTitle>
          </div>
          <CardDescription>
            {bloquesEntidad.length} bloques · semana lunes a viernes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bloquesEntidad.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin bloques para esta selección. {canWrite && modo === "seccion"
                ? "Usa “Agregar bloque” para construir el horario."
                : ""}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-24 border border-border bg-muted/40 p-2 text-xs font-semibold text-muted-foreground">
                      Hora
                    </th>
                    {DIAS.map((d) => (
                      <th
                        key={d.n}
                        className="border border-border bg-muted/40 p-2 text-xs font-semibold"
                      >
                        {d.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODOS.map((p) => (
                    <tr key={p.n}>
                      <td className="border border-border bg-muted/20 p-2 text-center text-xs font-medium text-muted-foreground">
                        {p.inicio}
                        <br />
                        {p.fin}
                      </td>
                      {DIAS.map((d) => {
                        const b = bloqueEn(d.n, p.inicio);
                        return (
                          <td
                            key={d.n}
                            className="border border-border p-1 align-top"
                          >
                            {b ? (
                              <Celda
                                modo={modo}
                                bloque={b}
                                canWrite={canWrite}
                                asignaturaLabel={asignaturaLabel}
                                empleadoLabel={empleadoLabel}
                                seccionLabel={seccionLabel}
                              />
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Celda({
  modo,
  bloque,
  canWrite,
  asignaturaLabel,
  empleadoLabel,
  seccionLabel,
}: {
  modo: Modo;
  bloque: HorarioBloque;
  canWrite: boolean;
  asignaturaLabel: (id: string) => string;
  empleadoLabel: (id: string) => string;
  seccionLabel: (id: string) => string;
}) {
  const secundaria =
    modo === "seccion"
      ? empleadoLabel(bloque.empleado_id)
      : modo === "docente"
        ? seccionLabel(bloque.seccion_id)
        : empleadoLabel(bloque.empleado_id);

  return (
    <div
      className={cn(
        "group/celda relative min-h-[3.5rem] rounded-md bg-primary/8 p-2",
      )}
    >
      <p className="text-xs font-semibold leading-tight text-primary">
        {asignaturaLabel(bloque.asignatura_id)}
      </p>
      <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">
        {secundaria}
      </p>
      {canWrite && modo === "seccion" && (
        <QuitarBloque id={bloque.id} />
      )}
    </div>
  );
}

function QuitarBloque({ id }: { id: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    quitarBloqueAction,
    {},
  );
  React.useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction} className="absolute right-1 top-1 hidden group-hover/celda:block print:hidden">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="Quitar bloque"
        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
