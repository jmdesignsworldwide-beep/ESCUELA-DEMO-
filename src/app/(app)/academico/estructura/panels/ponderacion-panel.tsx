"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Scale, Plus, Trash2, Check, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import { guardarPonderacionAction } from "../actions";
import type {
  ComponentePonderacion,
  EsquemaPonderacion,
} from "@/lib/academic/types";
import { cn } from "@/lib/utils";

interface Fila {
  nombre: string;
  codigo: string;
  peso: number;
}

export function PonderacionPanel({
  esquema,
  componentes,
  canWrite,
}: {
  esquema: EsquemaPonderacion | null;
  componentes: ComponentePonderacion[];
  canWrite: boolean;
}) {
  const [filas, setFilas] = React.useState<Fila[]>(
    componentes.map((c) => ({
      nombre: c.nombre,
      codigo: c.codigo,
      peso: Number(c.peso),
    })),
  );
  const [state, formAction] = useFormState(guardarPonderacionAction, {});

  React.useEffect(() => {
    if (state.ok) toast.success("Ponderación guardada");
    else if (state.error) toast.error(state.error);
  }, [state]);

  if (!esquema) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          No hay un esquema de ponderación configurado.
        </CardContent>
      </Card>
    );
  }

  const total = filas.reduce((s, f) => s + (Number.isFinite(f.peso) ? f.peso : 0), 0);
  const suma100 = Math.round(total * 100) === 10000;

  const update = (i: number, patch: Partial<Fila>) =>
    setFilas((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    );
  const remove = (i: number) =>
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
  const add = () =>
    setFilas((prev) => [...prev, { nombre: "", codigo: "", peso: 0 }]);

  const payload = JSON.stringify({
    esquema_id: esquema.id,
    componentes: filas.map((f) => ({
      nombre: f.nombre,
      codigo: f.codigo,
      peso: f.peso,
    })),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <CardTitle>Ponderación de la nota</CardTitle>
        </div>
        <CardDescription>
          Define el peso (%) de cada componente por período. El sistema valida
          que sumen exactamente 100% — en el servidor y en la base de datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filas.map((f, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] items-end gap-3 sm:grid-cols-[1fr_7rem_6rem_auto]"
            >
              <div className="space-y-1.5">
                {i === 0 && <Label className="text-xs">Componente</Label>}
                <Input
                  value={f.nombre}
                  onChange={(e) => update(i, { nombre: e.target.value })}
                  placeholder="Actividades y trabajos"
                  disabled={!canWrite}
                />
              </div>
              <div className="hidden space-y-1.5 sm:block">
                {i === 0 && <Label className="text-xs">Código</Label>}
                <Input
                  value={f.codigo}
                  onChange={(e) => update(i, { codigo: e.target.value })}
                  placeholder="ACT"
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-1.5">
                {i === 0 && <Label className="text-xs">Peso %</Label>}
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Number.isFinite(f.peso) ? f.peso : ""}
                  onChange={(e) =>
                    update(i, { peso: parseFloat(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="text-right"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                disabled={!canWrite}
                aria-label="Eliminar componente"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {canWrite && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            className="mt-4 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Agregar componente
          </Button>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
              suma100
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {suma100 ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Suma actual: {total % 1 === 0 ? total : total.toFixed(2)}%
            {suma100 ? " — correcto" : " — debe ser 100%"}
          </div>

          {canWrite && (
            <form action={formAction}>
              <input type="hidden" name="payload" value={payload} />
              <SubmitButton
                variant="gold"
                disabled={!suma100}
                loadingText="Guardando…"
              >
                Guardar ponderación
              </SubmitButton>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
