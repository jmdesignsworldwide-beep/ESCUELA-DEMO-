"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Lock, ShieldCheck, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  guardarCompetenciasAction,
  cerrarCompetenciasAction,
  corregirCompetenciaAction,
  type ActionState,
} from "./actions";
import { bandaDe, type BandaDesempeno } from "@/lib/competencias/types";
import { cn } from "@/lib/utils";

interface Comp {
  id: string;
  codigo: string;
  nombre: string;
}
interface Opcion {
  id: string;
  label: string;
}
type LibroRow = {
  id: string;
  estudiante_id: string;
  fundamental_id: string | null;
  especifica_id: string | null;
  valor: number;
};

interface ViewProps {
  canCerrar: boolean;
  isDirector: boolean;
  secciones: Opcion[];
  asignaturas: { id: string; nombre: string }[];
  periodos: { id: string; nombre: string; estado: string }[];
  seccionSel: string;
  asignaturaSel: string;
  periodoSel: string;
  fundamentales: Comp[];
  especificas: Comp[];
  bandas: BandaDesempeno[];
  roster: { id: string; nombre: string }[];
  libro: LibroRow[];
  cerrado: boolean;
}

export function LibroCompetenciasView(props: ViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const nav = (s: string, a: string, p: string) => {
    const params = new URLSearchParams();
    params.set("seccion", s);
    params.set("asignatura", a);
    params.set("periodo", p);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Sección</Label>
          <Select
            value={props.seccionSel}
            onValueChange={(v) => nav(v, props.asignaturaSel, props.periodoSel)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sección" />
            </SelectTrigger>
            <SelectContent>
              {props.secciones.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Asignatura</Label>
          <Select
            value={props.asignaturaSel}
            onValueChange={(v) => nav(props.seccionSel, v, props.periodoSel)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Asignatura" />
            </SelectTrigger>
            <SelectContent>
              {props.asignaturas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Período</Label>
          <Select
            value={props.periodoSel}
            onValueChange={(v) => nav(props.seccionSel, props.asignaturaSel, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {props.periodos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                  {p.estado === "cerrado" ? " (cerrado)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <LeyendaBandas bandas={props.bandas} />

      <Libro
        key={`${props.seccionSel}:${props.asignaturaSel}:${props.periodoSel}`}
        {...props}
      />
    </div>
  );
}

function LeyendaBandas({ bandas }: { bandas: BandaDesempeno[] }) {
  if (bandas.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
      <span className="font-medium text-muted-foreground">
        Niveles de dominio:
      </span>
      {bandas.map((b) => (
        <span key={b.id} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: b.color }}
          />
          <span className="font-medium">{b.nombre_corto}</span>
          <span className="text-muted-foreground">
            {b.etiqueta} ({b.min_valor}–{b.max_valor})
          </span>
        </span>
      ))}
    </div>
  );
}

function Libro({
  canCerrar,
  isDirector,
  seccionSel,
  asignaturaSel,
  periodoSel,
  fundamentales,
  especificas,
  bandas,
  roster,
  libro,
  cerrado,
}: ViewProps) {
  // Columnas: primero específicas del área, luego las 7 fundamentales.
  const columnas = React.useMemo(
    () => [
      ...especificas.map((c) => ({ ...c, tipo: "especifica" as const })),
      ...fundamentales.map((c) => ({ ...c, tipo: "fundamental" as const })),
    ],
    [especificas, fundamentales],
  );

  const keyOf = (est: string, tipo: string, comp: string) =>
    `${est}:${tipo}:${comp}`;
  const inicial = new Map<string, string>();
  const idByKey = new Map<string, string>();
  for (const l of libro) {
    const tipo = l.fundamental_id ? "fundamental" : "especifica";
    const comp = l.fundamental_id ?? l.especifica_id ?? "";
    inicial.set(keyOf(l.estudiante_id, tipo, comp), String(l.valor));
    idByKey.set(keyOf(l.estudiante_id, tipo, comp), l.id);
  }

  const [valores, setValores] = React.useState<Map<string, string>>(inicial);
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarCompetenciasAction,
    {},
  );
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Competencias guardadas");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const [correccion, setCorreccion] = React.useState<{
    id: string;
    valorActual: string;
    est: string;
    comp: string;
  } | null>(null);

  const inputs = React.useRef<(HTMLInputElement | null)[][]>([]);

  if (roster.length === 0 || columnas.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Selecciona una sección, asignatura y período con estudiantes y
        competencias configuradas.
      </Card>
    );
  }

  const setVal = (est: string, tipo: string, comp: string, v: string) => {
    const clean = v.replace(/[^\d.]/g, "");
    setValores((prev) => new Map(prev).set(keyOf(est, tipo, comp), clean));
  };

  // Nota del área = promedio de las competencias específicas.
  const notaArea = (est: string): number | null => {
    const vals = especificas
      .map((c) => parseFloat(valores.get(keyOf(est, "especifica", c.id)) ?? ""))
      .filter((v) => Number.isFinite(v));
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };

  const onKey = (
    ev: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number,
  ) => {
    const move = (r: number, c: number) => {
      const el = inputs.current[r]?.[c];
      if (el) {
        ev.preventDefault();
        el.focus();
        el.select();
      }
    };
    if (ev.key === "Enter" || ev.key === "ArrowDown") move(row + 1, col);
    else if (ev.key === "ArrowUp") move(row - 1, col);
    else if (
      ev.key === "ArrowRight" &&
      ev.currentTarget.selectionEnd === ev.currentTarget.value.length
    )
      move(row, col + 1);
    else if (ev.key === "ArrowLeft" && ev.currentTarget.selectionStart === 0)
      move(row, col - 1);
  };

  const payload = JSON.stringify({
    seccion_id: seccionSel,
    asignatura_id: asignaturaSel,
    periodo_id: periodoSel,
    notas: roster.flatMap((e) =>
      columnas
        .map((c) => ({
          estudiante_id: e.id,
          tipo: c.tipo,
          competencia_id: c.id,
          valor: parseFloat(valores.get(keyOf(e.id, c.tipo, c.id)) ?? ""),
        }))
        .filter((n) => Number.isFinite(n.valor)),
    ),
  });

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">
            Libro por competencias
            {cerrado && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Lock className="h-3 w-3" />
                Cerrado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {roster.length} estudiantes · {especificas.length} específicas +{" "}
            {fundamentales.length} fundamentales
            {cerrado
              ? " · período inmutable"
              : " — edita con teclado (Enter baja)."}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {!cerrado && (
            <>
              <form action={formAction}>
                <input type="hidden" name="payload" value={payload} />
                <SubmitButton size="sm" className="gap-1.5" loadingText="Guardando…">
                  <Save className="h-4 w-4" />
                  Guardar
                </SubmitButton>
              </form>
              {canCerrar && (
                <CerrarBoton
                  seccion={seccionSel}
                  asignatura={asignaturaSel}
                  periodo={periodoSel}
                />
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 min-w-[12rem] border border-border bg-muted/60 p-2 text-left text-xs font-semibold"
                >
                  Estudiante
                </th>
                {especificas.length > 0 && (
                  <th
                    colSpan={especificas.length}
                    className="border border-border bg-primary/5 p-1.5 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-primary"
                  >
                    Competencias específicas
                  </th>
                )}
                <th
                  rowSpan={2}
                  className="border border-border bg-primary/15 p-2 text-center text-xs font-semibold"
                >
                  Área
                </th>
                {fundamentales.length > 0 && (
                  <th
                    colSpan={fundamentales.length}
                    className="border border-border bg-gold/10 p-1.5 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-gold-foreground"
                  >
                    Competencias fundamentales
                  </th>
                )}
              </tr>
              <tr>
                {columnas.map((c) => (
                  <th
                    key={`${c.tipo}:${c.id}`}
                    className={cn(
                      "border border-border p-2 text-center text-xs font-semibold",
                      c.tipo === "especifica" ? "bg-primary/5" : "bg-gold/10",
                    )}
                    title={c.nombre}
                  >
                    {c.codigo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((e, row) => {
                const na = notaArea(e.id);
                const banda = bandaDe(na, bandas);
                const rowRefs =
                  inputs.current[row] ?? (inputs.current[row] = []);

                const celda = (c: Comp, tipo: "especifica" | "fundamental", col: number) => {
                  const k = keyOf(e.id, tipo, c.id);
                  const val = valores.get(k) ?? "";
                  const calId = idByKey.get(k);
                  return (
                    <td key={`${tipo}:${c.id}`} className="border border-border p-0">
                      {cerrado ? (
                        <button
                          type="button"
                          disabled={!isDirector || !calId}
                          onClick={() =>
                            calId &&
                            setCorreccion({
                              id: calId,
                              valorActual: val,
                              est: e.nombre,
                              comp: c.nombre,
                            })
                          }
                          className={cn(
                            "h-10 w-full text-center text-sm tabular-nums",
                            isDirector && calId
                              ? "cursor-pointer hover:bg-gold/10"
                              : "cursor-default",
                          )}
                          title={
                            isDirector
                              ? "Corregir (requiere justificación)"
                              : undefined
                          }
                        >
                          {val || "—"}
                        </button>
                      ) : (
                        <input
                          ref={(el) => {
                            rowRefs[col] = el;
                          }}
                          inputMode="decimal"
                          value={val}
                          onChange={(ev) => setVal(e.id, tipo, c.id, ev.target.value)}
                          onFocus={(ev) => ev.currentTarget.select()}
                          onKeyDown={(ev) => onKey(ev, row, col)}
                          className="h-10 w-full min-w-[3.25rem] bg-transparent text-center text-sm tabular-nums outline-none focus:bg-primary/5 focus:ring-2 focus:ring-inset focus:ring-ring"
                        />
                      )}
                    </td>
                  );
                };

                return (
                  <tr key={e.id}>
                    <td className="sticky left-0 z-10 border border-border bg-card p-2 font-medium">
                      {e.nombre}
                    </td>
                    {especificas.map((c, i) => celda(c, "especifica", i))}
                    <td
                      className="border border-border p-1.5 text-center font-semibold tabular-nums"
                      style={
                        banda
                          ? { backgroundColor: `${banda.color}1A`, color: banda.color }
                          : undefined
                      }
                      title={banda?.etiqueta}
                    >
                      {na === null ? "—" : na}
                      {banda && (
                        <span className="block text-[0.6rem] font-medium">
                          {banda.nombre_corto}
                        </span>
                      )}
                    </td>
                    {fundamentales.map((c, i) =>
                      celda(c, "fundamental", especificas.length + i),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {cerrado && isDirector && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            Período cerrado. Como director puedes corregir una competencia;
            quedará en la bitácora con tu justificación.
          </p>
        )}
      </CardContent>

      {correccion && (
        <CorreccionDialog data={correccion} onClose={() => setCorreccion(null)} />
      )}
    </Card>
  );
}

function CerrarBoton({
  seccion,
  asignatura,
  periodo,
}: {
  seccion: string;
  asignatura: string;
  periodo: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(
    cerrarCompetenciasAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) {
      toast.success("Período cerrado");
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="gold"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Lock className="h-4 w-4" />
        Cerrar período
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar período</DialogTitle>
          <DialogDescription>
            Al cerrar, las competencias quedan <strong>inmutables</strong>. Solo
            el director podrá corregir, con justificación registrada en bitácora.
            ¿Confirmas?
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="seccion_id" value={seccion} />
          <input type="hidden" name="asignatura_id" value={asignatura} />
          <input type="hidden" name="periodo_id" value={periodo} />
          <DialogFooter>
            <SubmitButton variant="gold" loadingText="Cerrando…">
              Sí, cerrar período
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CorreccionDialog({
  data,
  onClose,
}: {
  data: { id: string; valorActual: string; est: string; comp: string };
  onClose: () => void;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    corregirCompetenciaAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) {
      toast.success("Corrección aplicada y registrada en bitácora");
      onClose();
    } else if (state.error) toast.error(state.error);
  }, [state, onClose]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corregir competencia</DialogTitle>
          <DialogDescription>
            {data.est} · {data.comp}. La corrección queda registrada en la
            bitácora inviolable.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="calificacion_id" value={data.id} />
          <div className="space-y-2">
            <Label htmlFor="valor">Nuevo valor (0–100)</Label>
            <Input
              id="valor"
              name="valor"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={data.valorActual}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="justificacion">Justificación (obligatoria)</Label>
            <Input
              id="justificacion"
              name="justificacion"
              placeholder="Motivo de la corrección…"
              required
              minLength={5}
            />
          </div>
          <DialogFooter>
            <SubmitButton variant="gold" loadingText="Aplicando…">
              Aplicar corrección
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
