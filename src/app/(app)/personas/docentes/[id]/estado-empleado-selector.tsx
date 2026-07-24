"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { cambiarEstadoEmpleadoAction, type ActionState } from "../actions";
import {
  ESTADO_EMPLEADO_LABELS,
  type EstadoEmpleado,
} from "@/lib/staff/types";

export function EstadoEmpleadoSelector({
  empleadoId,
  estadoActual,
}: {
  empleadoId: string;
  estadoActual: EstadoEmpleado;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    cambiarEstadoEmpleadoAction,
    {},
  );
  const [estado, setEstado] = React.useState<string>(estadoActual);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (state.ok) toast.success("Estado actualizado");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="empleado_id" value={empleadoId} />
      <input type="hidden" name="estado" value={estado} />
      <Select value={estado} onValueChange={setEstado}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ESTADO_EMPLEADO_LABELS) as EstadoEmpleado[]).map((e) => (
            <SelectItem key={e} value={e}>
              {ESTADO_EMPLEADO_LABELS[e]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SubmitButton size="sm" variant="outline" disabled={estado === estadoActual}>
        Actualizar
      </SubmitButton>
    </form>
  );
}
