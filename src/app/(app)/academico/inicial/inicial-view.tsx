"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Baby, Sparkles, NotebookPen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { guardarEvaluacionInicialAction, type ActionState } from "./actions";
import {
  ESCALA_INICIAL,
  ESCALA_INICIAL_EMOJI,
  ESCALA_INICIAL_LABELS,
  type EscalaInicial,
} from "@/lib/inicial/types";
import { cn } from "@/lib/utils";

interface Opcion {
  id: string;
  label: string;
}

const ESCALA_COLOR: Record<EscalaInicial, string> = {
  en_proceso: "bg-warning/15 text-warning ring-warning/30",
  logrado: "bg-primary-light/15 text-primary ring-primary-light/30",
  consolidado: "bg-success/15 text-success ring-success/30",
};

export function InicialView(props: {
  canWrite: boolean;
  secciones: Opcion[];
  periodos: { id: string; nombre: string }[];
  roster: { id: string; nombre: string }[];
  areas: { id: string; nombre: string; codigo: string }[];
  indicadores: { id: string; area_id: string; descripcion: string }[];
  seccionSel: string;
  periodoSel: string;
  estudianteSel: string;
  evaluaciones: { indicador_id: string; valor: EscalaInicial }[];
  observacion: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const nav = (seccion: string, periodo: string, estudiante: string) => {
    const p = new URLSearchParams();
    p.set("seccion", seccion);
    p.set("periodo", periodo);
    p.set("estudiante", estudiante);
    router.replace(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="space-y-5">
      <Card className="border-gold/30 bg-gold-soft/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Sección</Label>
            <Select
              value={props.seccionSel}
              onValueChange={(v) => nav(v, props.periodoSel, "")}
            >
              <SelectTrigger className="bg-card">
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
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Estudiante</Label>
            <Select
              value={props.estudianteSel}
              onValueChange={(v) => nav(props.seccionSel, props.periodoSel, v)}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Estudiante" />
              </SelectTrigger>
              <SelectContent>
                {props.roster.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Select
              value={props.periodoSel}
              onValueChange={(v) => nav(props.seccionSel, v, props.estudianteSel)}
            >
              <SelectTrigger className="bg-card sm:w-44">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {props.periodos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {props.estudianteSel ? (
        <Evaluacion key={`${props.estudianteSel}:${props.periodoSel}`} {...props} />
      ) : (
        <Card className="p-10 text-center text-muted-foreground">
          Selecciona una sección y un estudiante de Nivel Inicial.
        </Card>
      )}
    </div>
  );
}

function Evaluacion({
  canWrite,
  areas,
  indicadores,
  seccionSel,
  periodoSel,
  estudianteSel,
  evaluaciones,
  observacion,
  roster,
}: React.ComponentProps<typeof InicialView>) {
  const inicial = new Map<string, EscalaInicial>(
    evaluaciones.map((e) => [e.indicador_id, e.valor]),
  );
  const [valores, setValores] = React.useState<Map<string, EscalaInicial>>(
    inicial,
  );
  const [obs, setObs] = React.useState(observacion);
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarEvaluacionInicialAction,
    {},
  );
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Evaluación guardada");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const nombre = roster.find((r) => r.id === estudianteSel)?.nombre ?? "";
  const evaluados = valores.size;
  const total = indicadores.length;

  const payload = JSON.stringify({
    seccion_id: seccionSel,
    estudiante_id: estudianteSel,
    periodo_id: periodoSel,
    observacion: obs,
    evaluaciones: Array.from(valores.entries()).map(([indicador_id, valor]) => ({
      indicador_id,
      valor,
    })),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-card p-4">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-2xl">
          👶
        </div>
        <div>
          <p className="font-serif text-lg font-semibold">{nombre}</p>
          <p className="text-sm text-muted-foreground">
            {evaluados} de {total} indicadores evaluados
          </p>
        </div>
      </div>

      {areas.map((area) => {
        const inds = indicadores.filter((i) => i.area_id === area.id);
        if (inds.length === 0) return null;
        return (
          <Card key={area.id} className="rounded-2xl border-gold/20">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gold" />
                <h3 className="font-serif text-lg font-semibold">{area.nombre}</h3>
              </div>
              <ul className="space-y-4">
                {inds.map((ind) => {
                  const actual = valores.get(ind.id);
                  return (
                    <li
                      key={ind.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm">{ind.descripcion}</span>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {ESCALA_INICIAL.map((esc) => {
                          const on = actual === esc;
                          return (
                            <button
                              key={esc}
                              type="button"
                              disabled={!canWrite}
                              onClick={() =>
                                setValores((prev) =>
                                  new Map(prev).set(ind.id, esc),
                                )
                              }
                              className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-all disabled:opacity-70",
                                on
                                  ? `${ESCALA_COLOR[esc]} scale-[1.03]`
                                  : "bg-muted/40 text-muted-foreground ring-transparent hover:ring-border",
                              )}
                            >
                              <span>{ESCALA_INICIAL_EMOJI[esc]}</span>
                              {ESCALA_INICIAL_LABELS[esc]}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Card className="rounded-2xl border-gold/20">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-gold" />
            <h3 className="font-serif text-lg font-semibold">
              Observaciones del docente
            </h3>
          </div>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={!canWrite}
            rows={4}
            placeholder="Escribe una observación narrativa y afectuosa sobre el proceso del niño(a)…"
          />
        </CardContent>
      </Card>

      {canWrite && (
        <div className="flex justify-end">
          <form action={formAction}>
            <input type="hidden" name="payload" value={payload} />
            <SubmitButton variant="gold" loadingText="Guardando…" className="gap-1.5">
              <Baby className="h-4 w-4" />
              Guardar evaluación
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
