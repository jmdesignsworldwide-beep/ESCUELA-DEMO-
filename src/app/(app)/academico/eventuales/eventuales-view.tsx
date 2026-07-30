"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Search, Star, ClipboardList } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  guardarEvaluacionEventualAction,
  type ActionState,
} from "./actions";
import type { EvaluacionEventualRow } from "@/lib/eventuales/queries";
import { formatFechaRD } from "@/lib/utils";

export function EventualesView({
  estudiantes,
  asignaturas,
  recientes,
}: {
  estudiantes: { id: string; nombre: string }[];
  asignaturas: { id: string; nombre: string }[];
  recientes: EvaluacionEventualRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Registrar estudiantes={estudiantes} asignaturas={asignaturas} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Recientes
          </CardTitle>
          <CardDescription>{recientes.length} evaluación(es).</CardDescription>
        </CardHeader>
        <CardContent>
          {recientes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no se han registrado evaluaciones eventuales.
            </p>
          ) : (
            <ul className="space-y-2">
              {recientes.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.estudiante}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.titulo}
                        {r.asignatura ? ` · ${r.asignatura}` : ""} ·{" "}
                        {formatFechaRD(r.fecha)}
                      </p>
                      {r.descripcion && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.descripcion}
                        </p>
                      )}
                    </div>
                    {r.nota !== null && (
                      <Badge variant="gold" className="shrink-0 gap-1">
                        <Star className="h-3 w-3" />
                        {r.nota.toFixed(0)}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Registrar({
  estudiantes,
  asignaturas,
}: {
  estudiantes: { id: string; nombre: string }[];
  asignaturas: { id: string; nombre: string }[];
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarEvaluacionEventualAction,
    {},
  );
  const [query, setQuery] = React.useState("");
  const [sel, setSel] = React.useState<{ id: string; nombre: string } | null>(
    null,
  );
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Evaluación registrada");
      setSel(null);
      setQuery("");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const filtrados = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return estudiantes.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 8);
  }, [query, estudiantes]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-gold" />
          Registrar evaluación eventual
        </CardTitle>
        <CardDescription>
          Nota u observación ocasional, fuera del libro ponderado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="estudiante_id" value={sel?.id ?? ""} required />
          <div className="space-y-1.5">
            <Label>Estudiante</Label>
            {sel ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{sel.nombre}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSel(null);
                    setQuery("");
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Escribe apellido o nombre…"
                  className="pl-9"
                />
                {filtrados.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-card">
                    {filtrados.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSel(e);
                            setQuery("");
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          {e.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input name="titulo" placeholder="Ej. Participación destacada" required />
            </div>
            <div className="space-y-1.5">
              <Label>Asignatura (opcional)</Label>
              <Select name="asignatura_id">
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {asignaturas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nota (opcional, 0–100)</Label>
              <Input name="nota" inputMode="decimal" placeholder="—" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input name="fecha" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Input name="descripcion" placeholder="Detalle de la evaluación…" />
          </div>

          <SubmitButton className="w-full" loadingText="Guardando…" disabled={!sel}>
            Registrar
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
