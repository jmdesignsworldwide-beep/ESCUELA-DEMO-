"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { GraduationCap, RefreshCcw, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
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
import { guardarRecuperacionAction, type ActionState } from "./actions";
import {
  ESTADO_PROMOCION_LABELS,
  INSTANCIA_LABELS,
  NOTA_MINIMA,
  type EstadoPromocion,
} from "@/lib/recovery/types";
import type { EstudianteRecup } from "./page";

const ESTADO_VARIANT: Record<
  EstadoPromocion,
  "success" | "warning" | "destructive"
> = {
  promovido: "success",
  condicionado: "warning",
  repite: "destructive",
};

export function RecuperacionView({
  secciones,
  seccionSel,
  estudiantes,
}: {
  secciones: { id: string; label: string }[];
  seccionSel: string;
  estudiantes: EstudianteRecup[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const conRecup = estudiantes.filter((e) => e.reprobadas > 0);
  const promovidos = estudiantes.filter((e) => e.estado === "promovido").length;
  const condicionados = estudiantes.filter((e) => e.estado === "condicionado").length;
  const repiten = estudiantes.filter((e) => e.estado === "repite").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label className="text-xs">Sección</Label>
          <Select
            value={seccionSel}
            onValueChange={(v) => router.replace(`${pathname}?seccion=${v}`)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Sección" />
            </SelectTrigger>
            <SelectContent>
              {secciones.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 text-sm">
          <Badge variant="success">Promovidos: {promovidos}</Badge>
          <Badge variant="warning">Condicionados: {condicionados}</Badge>
          <Badge variant="destructive">Repiten: {repiten}</Badge>
        </div>
      </div>

      {conRecup.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <GraduationCap className="h-8 w-8 text-success" />
          <p className="font-medium">Sin estudiantes en recuperación</p>
          <p className="text-sm text-muted-foreground">
            Todos los estudiantes de esta sección tienen sus asignaturas
            aprobadas.
          </p>
        </Card>
      ) : (
        conRecup.map((e) => (
          <Card key={e.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{e.nombre}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {e.reprobadas} pendiente(s)
                </span>
                <Badge variant={ESTADO_VARIANT[e.estado]}>
                  {ESTADO_PROMOCION_LABELS[e.estado]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {e.asignaturas
                .filter((a) => a.final !== null && a.final < NOTA_MINIMA)
                .map((a) => (
                  <AsignaturaFila
                    key={a.asignaturaId}
                    estudianteId={e.id}
                    seccionId={seccionSel}
                    asignatura={a}
                    puedeEspecial={e.reprobadas <= 2}
                  />
                ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function AsignaturaFila({
  estudianteId,
  seccionId,
  asignatura,
  puedeEspecial,
}: {
  estudianteId: string;
  seccionId: string;
  asignatura: EstudianteRecup["asignaturas"][number];
  puedeEspecial: boolean;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarRecuperacionAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Recuperación registrada");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const sig = asignatura.siguiente;
  const bloqueadoEspecial = sig === "especial" && !puedeEspecial;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{asignatura.nombre}</p>
        <p className="text-xs text-muted-foreground">
          Promedio: {asignatura.promedio?.toFixed(1) ?? "—"} · Nota actual:{" "}
          <span className="font-semibold text-destructive">
            {asignatura.final?.toFixed(1) ?? "—"}
          </span>
          {asignatura.registradas > 0 &&
            ` · ${asignatura.registradas} recuperación(es)`}
        </p>
      </div>

      {sig === null ? (
        <Badge variant="secondary">Recuperaciones agotadas</Badge>
      ) : bloqueadoEspecial ? (
        <span className="flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          Especial requiere ≤ 2 pendientes
        </span>
      ) : (
        <form
          action={formAction}
          className="flex items-end gap-2"
        >
          <input type="hidden" name="estudiante_id" value={estudianteId} />
          <input type="hidden" name="asignatura_id" value={asignatura.asignaturaId} />
          <input type="hidden" name="seccion_id" value={seccionId} />
          <input type="hidden" name="instancia" value={sig} />
          <div className="space-y-1">
            <Label className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <RefreshCcw className="mr-1 inline h-3 w-3" />
              {INSTANCIA_LABELS[sig]} (máx 70)
            </Label>
            <Input
              name="nota"
              type="number"
              min={0}
              max={70}
              step="1"
              placeholder="0–70"
              className="h-9 w-24"
              required
            />
          </div>
          <SubmitButton size="sm" variant="gold" loadingText="…">
            Registrar
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
