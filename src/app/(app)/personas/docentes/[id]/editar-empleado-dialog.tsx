"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { editarEmpleadoAction, type ActionState } from "../actions";
import { TIPO_EMPLEADO_LABELS, type TipoEmpleado } from "@/lib/staff/types";

interface EmpleadoData {
  id: string;
  nombres: string;
  apellidos: string;
  tipo: TipoEmpleado;
  cargo: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_ingreso: string | null;
  fecha_nacimiento: string | null;
  titulo_academico: string | null;
}

export function EditarEmpleadoDialog({ empleado }: { empleado: EmpleadoData }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(
    editarEmpleadoAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) {
      toast.success("Datos actualizados");
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const err = (k: string) => state.fieldErrors?.[k]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-4 w-4" />
          Editar datos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar empleado</DialogTitle>
          <DialogDescription>Actualiza los datos del personal.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="empleado_id" value={empleado.id} />
          <Field label="Nombres" error={err("nombres")}>
            <Input name="nombres" defaultValue={empleado.nombres} required />
          </Field>
          <Field label="Apellidos" error={err("apellidos")}>
            <Input name="apellidos" defaultValue={empleado.apellidos} required />
          </Field>
          <Field label="Tipo" error={err("tipo")}>
            <Select name="tipo" defaultValue={empleado.tipo} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_EMPLEADO_LABELS) as TipoEmpleado[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_EMPLEADO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cargo" error={err("cargo")}>
            <Input name="cargo" defaultValue={empleado.cargo} required />
          </Field>
          <Field label="Cédula" error={err("cedula")}>
            <Input name="cedula" defaultValue={empleado.cedula ?? ""} />
          </Field>
          <Field label="Teléfono" error={err("telefono")}>
            <Input name="telefono" defaultValue={empleado.telefono ?? ""} />
          </Field>
          <Field label="Correo" error={err("email")}>
            <Input name="email" type="email" defaultValue={empleado.email ?? ""} />
          </Field>
          <Field label="Fecha de ingreso" error={err("fecha_ingreso")}>
            <Input
              name="fecha_ingreso"
              type="date"
              defaultValue={empleado.fecha_ingreso ?? ""}
            />
          </Field>
          <Field label="Fecha de nacimiento" error={err("fecha_nacimiento")}>
            <Input
              name="fecha_nacimiento"
              type="date"
              defaultValue={empleado.fecha_nacimiento ?? ""}
            />
          </Field>
          <Field label="Título académico" error={err("titulo_academico")}>
            <Input
              name="titulo_academico"
              defaultValue={empleado.titulo_academico ?? ""}
            />
          </Field>
          <Field label="Dirección" error={err("direccion")}>
            <Input name="direccion" defaultValue={empleado.direccion ?? ""} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <SubmitButton loadingText="Guardando…">Guardar cambios</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
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
