"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Plus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { agregarBloqueAction, type ActionState } from "./actions";
import { PERIODOS, DIAS } from "@/lib/schedule/types";
import type { DocenteSeccion } from "@/lib/staff/types";

export function AgregarBloqueDialog({
  seccionId,
  aulaId,
  asignaciones,
  asignaturaLabel,
  empleadoLabel,
}: {
  seccionId: string;
  aulaId: string | null;
  asignaciones: DocenteSeccion[];
  asignaturaLabel: (id: string) => string;
  empleadoLabel: (id: string) => string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Agregar bloque
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar bloque de horario</DialogTitle>
          <DialogDescription>
            El sistema rechaza conflictos de docente, aula o sección.
          </DialogDescription>
        </DialogHeader>
        <Formulario
          seccionId={seccionId}
          aulaId={aulaId}
          asignaciones={asignaciones}
          asignaturaLabel={asignaturaLabel}
          empleadoLabel={empleadoLabel}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  seccionId,
  aulaId,
  asignaciones,
  asignaturaLabel,
  empleadoLabel,
  onDone,
}: {
  seccionId: string;
  aulaId: string | null;
  asignaciones: DocenteSeccion[];
  asignaturaLabel: (id: string) => string;
  empleadoLabel: (id: string) => string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    agregarBloqueAction,
    {},
  );
  const done = React.useRef(false);

  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Bloque agregado");
      onDone();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="seccion_id" value={seccionId} />
      {aulaId && <input type="hidden" name="aula_id" value={aulaId} />}

      {state.error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Asignatura y docente</Label>
        <Select name="asignacion_id" required>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona…" />
          </SelectTrigger>
          <SelectContent>
            {asignaciones.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {asignaturaLabel(a.asignatura_id)} — {empleadoLabel(a.empleado_id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {asignaciones.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Esta sección no tiene docentes asignados todavía.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Día</Label>
          <Select name="dia_semana" required>
            <SelectTrigger>
              <SelectValue placeholder="Día" />
            </SelectTrigger>
            <SelectContent>
              {DIAS.map((d) => (
                <SelectItem key={d.n} value={String(d.n)}>
                  {d.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Período</Label>
          <Select name="periodo" required>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.n} value={String(p.n)}>
                  {p.inicio} – {p.fin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <SubmitButton loadingText="Agregando…" disabled={asignaciones.length === 0}>
          Agregar
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
