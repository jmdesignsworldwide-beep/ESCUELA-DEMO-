"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Send,
  Lock,
  Unlock,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubmitButton } from "@/components/auth/submit-button";
import { configBloqueoAction, type ActionState } from "./actions";
import { formatRD } from "@/lib/utils";
import { MESES } from "@/lib/finance/types";
import type { MorosidadFamilia, Proyeccion } from "@/lib/collections/queries";

export function MorosidadView({
  canWrite,
  panel,
  proyeccion,
  mes,
  bloqueoActivo,
  diasGracia,
}: {
  canWrite: boolean;
  panel: MorosidadFamilia[];
  proyeccion: Proyeccion;
  mes: number;
  bloqueoActivo: boolean;
  diasGracia: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const totalSaldo = panel.reduce((s, f) => s + f.saldo, 0);
  const totalMora = panel.reduce((s, f) => s + f.mora, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Saldo moroso"
          value={formatRD(totalSaldo)}
          danger
        />
        <Stat label="Mora acumulada" value={formatRD(totalMora)} />
        <Stat label="Familias morosas" value={String(panel.length)} />
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label={`Proyección`}
          value={formatRD(proyeccion.esperado)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Bloqueo por morosidad */}
        <Card className={bloqueoActivo ? "border-destructive/40" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Bloqueo por morosidad
            </CardTitle>
            <CardDescription>
              Validado en servidor: si se activa, un estudiante moroso no puede
              ver sus calificaciones/boletín (más allá de los días de gracia).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={bloqueoActivo ? "destructive" : "secondary"} className="gap-1.5">
                {bloqueoActivo ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
                {bloqueoActivo ? "Activo" : "Inactivo"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Días de gracia: {diasGracia}
              </span>
            </div>
            {canWrite && (
              <BloqueoForm bloqueoActivo={bloqueoActivo} diasGracia={diasGracia} />
            )}
          </CardContent>
        </Card>

        {/* Proyección del mes */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Proyección de ingresos</CardTitle>
              <CardDescription>Cargos del mes seleccionado.</CardDescription>
            </div>
            <Select
              value={String(mes)}
              onValueChange={(v) => router.replace(`${pathname}?mes=${v}`)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.n} value={String(m.n)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Mini label="Esperado" value={proyeccion.esperado} />
            <Mini label="Cobrado" value={proyeccion.cobrado} accent="success" />
            <Mini label="Pendiente" value={proyeccion.pendiente} accent="danger" />
          </CardContent>
        </Card>
      </div>

      {/* Panel de antigüedad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Antigüedad de saldo</CardTitle>
          <CardDescription>
            {panel.length} familias con saldo vencido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Familia</TableHead>
                <TableHead className="text-right">0–30</TableHead>
                <TableHead className="text-right">31–60</TableHead>
                <TableHead className="text-right">61–90</TableHead>
                <TableHead className="text-right">90+</TableHead>
                <TableHead className="text-right">Mora</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {panel.slice(0, 60).map((f) => (
                <TableRow key={f.familia_id}>
                  <TableCell className="font-medium">
                    Familia {f.apellido}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({f.dias_max}d)
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.b_0_30 > 0 ? formatRD(f.b_0_30) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.b_31_60 > 0 ? formatRD(f.b_31_60) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {f.b_61_90 > 0 ? formatRD(f.b_61_90) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {f.b_90mas > 0 ? formatRD(f.b_90mas) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-warning">
                    {formatRD(f.mora)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatRD(f.saldo)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link href={`/documentos/cobro/${f.familia_id}`} target="_blank">
                        <Send className="h-3.5 w-3.5" />
                        Cobrar
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BloqueoForm({
  bloqueoActivo,
  diasGracia,
}: {
  bloqueoActivo: boolean;
  diasGracia: number;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    configBloqueoAction,
    {},
  );
  const [on, setOn] = React.useState(bloqueoActivo);
  React.useEffect(() => {
    if (state.ok) toast.success("Configuración actualizada");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="bloqueo" value={on ? "on" : "off"} />
      <Button
        type="button"
        variant={on ? "destructive" : "outline"}
        size="sm"
        onClick={() => setOn((v) => !v)}
        className="gap-1.5"
      >
        {on ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        {on ? "Bloqueo activado" : "Bloqueo desactivado"}
      </Button>
      <div className="space-y-1">
        <Label className="text-xs">Días de gracia</Label>
        <Input
          name="dias_gracia"
          type="number"
          min={0}
          max={120}
          defaultValue={diasGracia}
          className="h-9 w-24"
        />
      </div>
      <SubmitButton size="sm" loadingText="Guardando…">
        Guardar
      </SubmitButton>
    </form>
  );
}

function Stat({
  icon,
  label,
  value,
  danger,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={
          "mt-1 font-serif text-xl font-semibold " +
          (danger ? "text-destructive" : "text-foreground")
        }
      >
        {value}
      </p>
    </Card>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 font-semibold tabular-nums " +
          (accent === "success"
            ? "text-success"
            : accent === "danger"
              ? "text-destructive"
              : "text-foreground")
        }
      >
        {formatRD(value)}
      </p>
    </div>
  );
}
