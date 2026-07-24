"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { AlertCircle, UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { crearEstudianteAction, type ActionState } from "./actions";
import type { Grado, Nivel, Seccion } from "@/lib/academic/types";

const SANGRES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function NuevoEstudianteDialog({
  niveles,
  grados,
  secciones,
}: {
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 whitespace-nowrap">
          <UserPlus className="h-4 w-4" />
          Nuevo estudiante
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo estudiante</DialogTitle>
          <DialogDescription>
            Registra al estudiante y su inscripción en una sección.
          </DialogDescription>
        </DialogHeader>
        <Formulario
          niveles={niveles}
          grados={grados}
          secciones={secciones}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  niveles,
  grados,
  secciones,
  onDone,
}: {
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
  onDone: () => void;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    crearEstudianteAction,
    {},
  );
  const [gradoId, setGradoId] = React.useState("");
  const done = React.useRef(false);

  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Estudiante registrado e inscrito");
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

  const err = (k: string) => state.fieldErrors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombres" error={err("nombres")}>
          <Input name="nombres" placeholder="José Manuel" required />
        </Campo>
        <Campo label="Apellidos" error={err("apellidos")}>
          <Input name="apellidos" placeholder="Peralta Reyes" required />
        </Campo>
        <Campo label="Sexo" error={err("sexo")}>
          <Select name="sexo" required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Fecha de nacimiento" error={err("fecha_nacimiento")}>
          <Input name="fecha_nacimiento" type="date" required />
        </Campo>
        <Campo label="Lugar de nacimiento" error={err("lugar_nacimiento")}>
          <Input name="lugar_nacimiento" placeholder="Santiago" />
        </Campo>
        <Campo label="Tipo de sangre" error={err("tipo_sangre")}>
          <Select name="tipo_sangre">
            <SelectTrigger>
              <SelectValue placeholder="N/A" />
            </SelectTrigger>
            <SelectContent>
              {SANGRES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Campo label="Tipo de documento" error={err("tipo_documento")}>
          <Select name="tipo_documento" defaultValue="acta">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acta">Acta de nacimiento</SelectItem>
              <SelectItem value="cedula">Cédula</SelectItem>
              <SelectItem value="pasaporte">Pasaporte</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="N.° de documento" error={err("numero_documento")}>
          <Input name="numero_documento" placeholder="000-0000000-0" />
        </Campo>
        <Campo label="RNE" error={err("rne")}>
          <Input name="rne" placeholder="Registro Nacional" />
        </Campo>
      </section>

      <Campo label="Dirección" error={err("direccion")}>
        <Input name="direccion" placeholder="Calle, sector, ciudad" />
      </Campo>

      <section className="grid gap-4 sm:grid-cols-2">
        <Campo label="Alergias" error={err("alergias")}>
          <Input name="alergias" placeholder="Ninguna conocida" />
        </Campo>
        <Campo label="Condiciones médicas" error={err("condiciones_medicas")}>
          <Input name="condiciones_medicas" placeholder="Ninguna" />
        </Campo>
      </section>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-semibold">Inscripción</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Grado" error={err("grado_id")}>
            <Select
              name="grado_id"
              value={gradoId}
              onValueChange={(v) => setGradoId(v)}
              required
            >
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
          </Campo>
          <Campo label="Sección" error={err("seccion_id")}>
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
          </Campo>
        </div>
      </div>

      <DialogFooter>
        <SubmitButton loadingText="Registrando…">
          Registrar e inscribir
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
