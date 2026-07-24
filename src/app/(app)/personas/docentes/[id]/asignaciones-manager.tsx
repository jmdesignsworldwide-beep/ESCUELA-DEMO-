"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Plus, Trash2, AlertCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  asignarSeccionAction,
  quitarAsignacionAction,
  type ActionState,
} from "../actions";
import type { Grado, Nivel, Seccion, Asignatura } from "@/lib/academic/types";

export interface AsignacionRow {
  id: string;
  asignaturaNombre: string;
  seccionLabel: string;
  horas: number;
}

export function AsignacionesManager({
  empleadoId,
  esDocente,
  canWrite,
  rows,
  niveles,
  grados,
  secciones,
  asignaturas,
}: {
  empleadoId: string;
  esDocente: boolean;
  canWrite: boolean;
  rows: AsignacionRow[];
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
  asignaturas: Asignatura[];
}) {
  const totalHoras = rows.reduce((s, r) => s + r.horas, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">
            Asignaciones {esDocente ? "de docencia" : ""}
          </CardTitle>
          <CardDescription>
            {rows.length} asignaciones · {totalHoras} horas semanales.
          </CardDescription>
        </div>
        {canWrite && esDocente && (
          <AsignarDialog
            empleadoId={empleadoId}
            niveles={niveles}
            grados={grados}
            secciones={secciones}
            asignaturas={asignaturas}
          />
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin asignaciones registradas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asignatura</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.asignaturaNombre}
                  </TableCell>
                  <TableCell>{r.seccionLabel}</TableCell>
                  <TableCell className="text-right">{r.horas}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <QuitarBoton id={r.id} empleadoId={empleadoId} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 0 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Carga total:{" "}
            <span className="font-semibold text-foreground">
              {totalHoras} h/sem.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuitarBoton({
  id,
  empleadoId,
}: {
  id: string;
  empleadoId: string;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    quitarAsignacionAction,
    {},
  );
  React.useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="empleado_id" value={empleadoId} />
      <SubmitButton
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        loadingText=""
      >
        <Trash2 className="h-4 w-4" />
      </SubmitButton>
    </form>
  );
}

function AsignarDialog({
  empleadoId,
  niveles,
  grados,
  secciones,
  asignaturas,
}: {
  empleadoId: string;
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
  asignaturas: Asignatura[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Asignar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar sección y asignatura</DialogTitle>
          <DialogDescription>
            Vincula al docente con una sección, asignatura y carga horaria.
          </DialogDescription>
        </DialogHeader>
        <AsignarForm
          empleadoId={empleadoId}
          niveles={niveles}
          grados={grados}
          secciones={secciones}
          asignaturas={asignaturas}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AsignarForm({
  empleadoId,
  niveles,
  grados,
  secciones,
  asignaturas,
  onDone,
}: {
  empleadoId: string;
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
  asignaturas: Asignatura[];
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    asignarSeccionAction,
    {},
  );
  const [gradoId, setGradoId] = React.useState("");
  const done = React.useRef(false);

  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Asignación creada");
      onDone();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onDone]);

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradosOrdenados = [...grados].sort((a, b) => {
    const na = nivelPorId.get(a.nivel_id)?.orden ?? 0;
    const nb = nivelPorId.get(b.nivel_id)?.orden ?? 0;
    return na - nb || a.orden - b.orden;
  });
  const seccionesGrado = secciones.filter((s) => s.grado_id === gradoId);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="empleado_id" value={empleadoId} />
      {state.error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Grado</Label>
        <Select value={gradoId} onValueChange={setGradoId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona…" />
          </SelectTrigger>
          <SelectContent>
            {gradosOrdenados.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {nivelPorId.get(g.nivel_id)?.nombre} · {g.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sección</Label>
        <Select name="seccion_id" required disabled={!gradoId}>
          <SelectTrigger>
            <SelectValue
              placeholder={gradoId ? "Selecciona…" : "Elige grado primero"}
            />
          </SelectTrigger>
          <SelectContent>
            {seccionesGrado.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Sección &quot;{s.nombre}&quot;
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Asignatura</Label>
          <Select name="asignatura_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona…" />
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
        <div className="space-y-2">
          <Label htmlFor="horas">Horas semanales</Label>
          <Input
            id="horas"
            name="horas_semanales"
            type="number"
            min={1}
            max={40}
            defaultValue={4}
            required
          />
        </div>
      </div>

      <DialogFooter>
        <SubmitButton loadingText="Asignando…">Asignar</SubmitButton>
      </DialogFooter>
    </form>
  );
}
