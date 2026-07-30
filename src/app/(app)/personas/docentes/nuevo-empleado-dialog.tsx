"use client";

import { CrearDialog } from "@/components/academico/crear-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearEmpleadoAction } from "./actions";
import { TIPO_EMPLEADO_LABELS, type TipoEmpleado } from "@/lib/staff/types";

export function NuevoEmpleadoDialog() {
  return (
    <CrearDialog
      triggerLabel="Nuevo empleado"
      title="Nuevo empleado"
      description="Registra un docente o miembro del personal."
      action={crearEmpleadoAction}
      submitLabel="Registrar"
    >
      {(state) => {
        const err = (k: string) => state.fieldErrors?.[k]?.[0];
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombres" error={err("nombres")}>
              <Input name="nombres" placeholder="Ana María" required />
            </Field>
            <Field label="Apellidos" error={err("apellidos")}>
              <Input name="apellidos" placeholder="Reyes Guzmán" required />
            </Field>
            <Field label="Tipo" error={err("tipo")}>
              <Select name="tipo" defaultValue="docente" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_EMPLEADO_LABELS) as TipoEmpleado[]).map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_EMPLEADO_LABELS[t]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cargo" error={err("cargo")}>
              <Input name="cargo" placeholder="Docente de Matemática" required />
            </Field>
            <Field label="Cédula" error={err("cedula")}>
              <Input name="cedula" placeholder="000-0000000-0" />
            </Field>
            <Field label="Teléfono" error={err("telefono")}>
              <Input name="telefono" placeholder="809-000-0000" />
            </Field>
            <Field label="Correo" error={err("email")}>
              <Input name="email" type="email" placeholder="nombre@escuela.edu.do" />
            </Field>
            <Field label="Fecha de ingreso" error={err("fecha_ingreso")}>
              <Input name="fecha_ingreso" type="date" />
            </Field>
            <Field label="Fecha de nacimiento" error={err("fecha_nacimiento")}>
              <Input name="fecha_nacimiento" type="date" />
            </Field>
            <Field label="Título académico" error={err("titulo_academico")}>
              <Input name="titulo_academico" placeholder="Licenciatura en Educación" />
            </Field>
            <Field label="Dirección" error={err("direccion")}>
              <Input name="direccion" placeholder="Ciudad" />
            </Field>
          </div>
        );
      }}
    </CrearDialog>
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
