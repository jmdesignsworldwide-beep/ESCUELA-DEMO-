"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Lock, TriangleAlert, ShieldCheck, Save } from "lucide-react";
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
  guardarNotasAction,
  cerrarPeriodoAction,
  corregirAction,
  type ActionState,
} from "./actions";
import { NOTA_MINIMA, notaPonderada } from "@/lib/grades/types";
import { cn } from "@/lib/utils";

interface Comp {
  id: string;
  nombre: string;
  codigo: string;
  peso: number;
}
interface Opcion {
  id: string;
  label: string;
}

export function LibroView(props: {
  canCerrar: boolean;
  isDirector: boolean;
  secciones: Opcion[];
  asignaturas: { id: string; nombre: string }[];
  periodos: { id: string; nombre: string; estado: string }[];
  seccionSel: string;
  asignaturaSel: string;
  periodoSel: string;
  componentes: Comp[];
  roster: { id: string; nombre: string }[];
  libro: {
    id: string;
    estudiante_id: string;
    componente_id: string;
    valor: number;
  }[];
  cerrado: boolean;
}) {
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

      <Libro
        key={`${props.seccionSel}:${props.asignaturaSel}:${props.periodoSel}`}
        {...props}
      />
    </div>
  );
}

function Libro({
  canCerrar,
  isDirector,
  seccionSel,
  asignaturaSel,
  periodoSel,
  componentes,
  roster,
  libro,
  cerrado,
}: React.ComponentProps<typeof LibroView>) {
  const pesos = new Map(componentes.map((c) => [c.id, c.peso]));
  const sumaPesos = componentes.reduce((s, c) => s + c.peso, 0);

  // Estado editable: key `${estId}:${compId}` -> string.
  const keyOf = (e: string, c: string) => `${e}:${c}`;
  const inicial = new Map<string, string>();
  const idByKey = new Map<string, string>();
  for (const l of libro) {
    inicial.set(keyOf(l.estudiante_id, l.componente_id), String(l.valor));
    idByKey.set(keyOf(l.estudiante_id, l.componente_id), l.id);
  }
  const [valores, setValores] = React.useState<Map<string, string>>(inicial);
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarNotasAction,
    {},
  );
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Calificaciones guardadas");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  // Correction dialog
  const [correccion, setCorreccion] = React.useState<{
    id: string;
    valorActual: string;
    est: string;
    comp: string;
  } | null>(null);

  const inputs = React.useRef<(HTMLInputElement | null)[][]>([]);

  if (roster.length === 0 || componentes.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Selecciona sección, asignatura y período con estudiantes y ponderación.
      </Card>
    );
  }

  const setVal = (e: string, c: string, v: string) => {
    const clean = v.replace(/[^\d.]/g, "");
    setValores((prev) => new Map(prev).set(keyOf(e, c), clean));
  };

  const notaFinal = (est: string): number | null => {
    const vals = componentes
      .map((c) => ({
        componente_id: c.id,
        valor: parseFloat(valores.get(keyOf(est, c.id)) ?? ""),
      }))
      .filter((x) => Number.isFinite(x.valor));
    if (vals.length === 0) return null;
    return notaPonderada(vals, pesos);
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
    else if (ev.key === "ArrowRight" && ev.currentTarget.selectionEnd === ev.currentTarget.value.length)
      move(row, col + 1);
    else if (ev.key === "ArrowLeft" && ev.currentTarget.selectionStart === 0)
      move(row, col - 1);
  };

  const payload = JSON.stringify({
    seccion_id: seccionSel,
    asignatura_id: asignaturaSel,
    periodo_id: periodoSel,
    notas: roster.flatMap((e) =>
      componentes
        .map((c) => ({
          estudiante_id: e.id,
          componente_id: c.id,
          valor: parseFloat(valores.get(keyOf(e.id, c.id)) ?? ""),
        }))
        .filter((n) => Number.isFinite(n.valor)),
    ),
  });

  const enRiesgo = roster.filter((e) => {
    const n = notaFinal(e.id);
    return n !== null && n < NOTA_MINIMA;
  }).length;

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">
            Libro de calificaciones
            {cerrado && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Lock className="h-3 w-3" />
                Cerrado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {roster.length} estudiantes · ponderación {sumaPesos}% ·{" "}
            <span className={enRiesgo > 0 ? "font-semibold text-destructive" : ""}>
              {enRiesgo} en riesgo
            </span>
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
              {canCerrar && <CerrarBoton seccion={seccionSel} asignatura={asignaturaSel} periodo={periodoSel} />}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[12rem] border border-border bg-muted/60 p-2 text-left text-xs font-semibold">
                  Estudiante
                </th>
                {componentes.map((c) => (
                  <th
                    key={c.id}
                    className="border border-border bg-muted/40 p-2 text-center text-xs font-semibold"
                    title={c.nombre}
                  >
                    {c.codigo}
                    <span className="block font-normal text-muted-foreground">
                      {c.peso}%
                    </span>
                  </th>
                ))}
                <th className="border border-border bg-primary/10 p-2 text-center text-xs font-semibold">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.map((e, row) => {
                const nf = notaFinal(e.id);
                const riesgo = nf !== null && nf < NOTA_MINIMA;
                const rowRefs =
                  inputs.current[row] ?? (inputs.current[row] = []);
                return (
                  <tr key={e.id}>
                    <td className="sticky left-0 z-10 border border-border bg-card p-2 font-medium">
                      {e.nombre}
                    </td>
                    {componentes.map((c, col) => {
                      const k = keyOf(e.id, c.id);
                      const val = valores.get(k) ?? "";
                      const calId = idByKey.get(k);
                      return (
                        <td key={c.id} className="border border-border p-0">
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
                              onChange={(ev) => setVal(e.id, c.id, ev.target.value)}
                              onFocus={(ev) => ev.currentTarget.select()}
                              onKeyDown={(ev) => onKey(ev, row, col)}
                              className="h-10 w-full min-w-[3.5rem] bg-transparent text-center text-sm tabular-nums outline-none focus:bg-primary/5 focus:ring-2 focus:ring-inset focus:ring-ring"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td
                      className={cn(
                        "border border-border p-2 text-center font-semibold tabular-nums",
                        nf === null
                          ? "text-muted-foreground"
                          : riesgo
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success",
                      )}
                    >
                      {nf === null ? "—" : nf.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {enRiesgo > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
            <TriangleAlert className="h-3.5 w-3.5" />
            {enRiesgo} estudiante(s) por debajo de {NOTA_MINIMA} (en riesgo).
          </p>
        )}
        {cerrado && isDirector && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            Período cerrado. Como director puedes corregir una nota; quedará en la
            bitácora con tu justificación.
          </p>
        )}
      </CardContent>

      {correccion && (
        <CorreccionDialog
          data={correccion}
          onClose={() => setCorreccion(null)}
        />
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
    cerrarPeriodoAction,
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
      <Button variant="gold" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Lock className="h-4 w-4" />
        Cerrar período
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar período</DialogTitle>
          <DialogDescription>
            Al cerrar, las calificaciones quedan <strong>inmutables</strong>.
            Solo el director podrá corregir, con justificación registrada en
            bitácora. ¿Confirmas?
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
    corregirAction,
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
          <DialogTitle>Corregir calificación</DialogTitle>
          <DialogDescription>
            {data.est} · {data.comp}. La corrección queda registrada en la
            bitácora inviolable.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="calificacion_id" value={data.id} />
          <div className="grid gap-4 sm:grid-cols-2">
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
