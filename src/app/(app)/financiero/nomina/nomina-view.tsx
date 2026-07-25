"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  Banknote,
  Calculator,
  Lock,
  FileText,
  Plus,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import {
  crearNominaAction,
  recalcularNominaAction,
  cerrarNominaAction,
  configNominaAction,
  type ActionState,
} from "./actions";
import { formatRD } from "@/lib/utils";
import {
  MESES_NOMINA,
  nombreMes,
  TIPO_NOMINA_LABELS,
  type ConfigNomina,
  type Nomina,
  type NominaLinea,
  type ResumenNomina,
} from "@/lib/payroll/types";

export function NominaView({
  canWrite,
  anioActual,
  config,
  nominas,
  seleccionada,
  lineas,
  resumen,
  nombres,
  cargos,
}: {
  canWrite: boolean;
  anioActual: number;
  config: ConfigNomina | null;
  nominas: Nomina[];
  seleccionada: Nomina | null;
  lineas: NominaLinea[];
  resumen: ResumenNomina | null;
  nombres: Record<string, string>;
  cargos: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const seleccionar = (id: string) => router.replace(`${pathname}?n=${id}`);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        {canWrite && (
          <CrearNominaCard
            anioActual={anioActual}
            onCreated={(id) => seleccionar(id)}
          />
        )}
        <ConfigCard config={config} canWrite={canWrite} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Períodos</CardTitle>
            <CardDescription>{nominas.length} nóminas registradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {nominas.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aún no hay nóminas. Genera la primera.
              </p>
            )}
            {nominas.map((n) => (
              <button
                key={n.id}
                onClick={() => seleccionar(n.id)}
                className={
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                  (seleccionada?.id === n.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50")
                }
              >
                <span className="font-medium">
                  {nombreMes(n.mes)} {n.anio}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {TIPO_NOMINA_LABELS[n.tipo]}
                  </span>
                </span>
                <Badge
                  variant={n.estado === "cerrada" ? "secondary" : "outline"}
                  className="gap-1"
                >
                  {n.estado === "cerrada" && <Lock className="h-3 w-3" />}
                  {n.estado === "cerrada" ? "Cerrada" : "Borrador"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {!seleccionada ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Banknote className="h-8 w-8 opacity-40" />
              <p className="text-sm">Selecciona o genera una nómina para ver el detalle.</p>
            </CardContent>
          </Card>
        ) : (
          <DetalleNomina
            canWrite={canWrite}
            nomina={seleccionada}
            lineas={lineas}
            resumen={resumen}
            nombres={nombres}
            cargos={cargos}
          />
        )}
      </div>
    </div>
  );
}

function DetalleNomina({
  canWrite,
  nomina,
  lineas,
  resumen,
  nombres,
  cargos,
}: {
  canWrite: boolean;
  nomina: Nomina;
  lineas: NominaLinea[];
  resumen: ResumenNomina | null;
  nombres: Record<string, string>;
  cargos: Record<string, string>;
}) {
  const abierta = nomina.estado === "borrador";
  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">
              {nombreMes(nomina.mes)} {nomina.anio}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {TIPO_NOMINA_LABELS[nomina.tipo]}
              </span>
            </CardTitle>
            <CardDescription>
              {nomina.estado === "cerrada" ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Cerrada e inmutable
                </span>
              ) : (
                "Borrador — puede recalcularse o cerrarse."
              )}
            </CardDescription>
          </div>
          {canWrite && abierta && (
            <div className="flex gap-2">
              <RecalcularForm nominaId={nomina.id} />
              <CerrarForm nominaId={nomina.id} disabled={lineas.length === 0} />
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Empleados" value={String(resumen?.empleados ?? 0)} />
          <Stat label="Bruto" value={formatRD(resumen?.total_bruto ?? 0)} />
          <Stat label="AFP" value={formatRD(resumen?.total_afp ?? 0)} muted />
          <Stat label="SFS" value={formatRD(resumen?.total_sfs ?? 0)} muted />
          <Stat label="ISR" value={formatRD(resumen?.total_isr ?? 0)} muted />
          <Stat label="Neto" value={formatRD(resumen?.total_neto ?? 0)} accent />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle por empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Salario</TableHead>
                  <TableHead className="text-right">AFP</TableHead>
                  <TableHead className="text-right">SFS</TableHead>
                  <TableHead className="text-right">ISR</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {nombres[l.empleado_id] ?? "—"}
                      <span className="block text-xs text-muted-foreground">
                        {cargos[l.empleado_id] ?? ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRD(l.salario_base)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {l.afp > 0 ? formatRD(l.afp) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {l.sfs > 0 ? formatRD(l.sfs) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {l.isr > 0 ? formatRD(l.isr) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatRD(l.neto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link href={`/documentos/volante/${l.id}`} target="_blank">
                          <FileText className="h-3.5 w-3.5" />
                          Volante
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lineas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Sin líneas. Recalcula desde los contratos activos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function CrearNominaCard({
  anioActual,
  onCreated,
}: {
  anioActual: number;
  onCreated: (id: string) => void;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    crearNominaAction,
    {},
  );
  const [mes, setMes] = React.useState("6");
  const [tipo, setTipo] = React.useState("ordinaria");
  React.useEffect(() => {
    if (state.ok && state.nominaId) {
      toast.success("Nómina generada");
      onCreated(state.nominaId);
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4" /> Generar nómina
        </CardTitle>
        <CardDescription>Calcula TSS e ISR desde los contratos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="anio" value={anioActual} />
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="tipo" value={tipo} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mes</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES_NOMINA.map((m) => (
                    <SelectItem key={m.n} value={String(m.n)}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinaria">Ordinaria</SelectItem>
                  <SelectItem value="regalia">Regalía pascual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SubmitButton className="w-full gap-1.5" loadingText="Generando…">
            <Calculator className="h-4 w-4" />
            Generar {anioActual}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

function ConfigCard({
  config,
  canWrite,
}: {
  config: ConfigNomina | null;
  canWrite: boolean;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    configNominaAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Parámetros actualizados");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Parámetros TSS</CardTitle>
        <CardDescription>
          Retención del empleado. ISR según escala DGII.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canWrite ? (
          <div className="flex gap-4 text-sm">
            <span>AFP: {config?.afp_pct ?? 2.87}%</span>
            <span>SFS: {config?.sfs_pct ?? 3.04}%</span>
          </div>
        ) : (
          <form action={formAction} className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">AFP %</Label>
              <Input
                name="afp_pct"
                type="number"
                step="0.0001"
                defaultValue={config?.afp_pct ?? 2.87}
                className="h-9 w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SFS %</Label>
              <Input
                name="sfs_pct"
                type="number"
                step="0.0001"
                defaultValue={config?.sfs_pct ?? 3.04}
                className="h-9 w-24"
              />
            </div>
            <SubmitButton size="sm" loadingText="…">
              Guardar
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function RecalcularForm({ nominaId }: { nominaId: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    recalcularNominaAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Nómina recalculada");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="nomina_id" value={nominaId} />
      <SubmitButton variant="outline" size="sm" loadingText="…" className="gap-1.5">
        <RefreshCcw className="h-3.5 w-3.5" />
        Recalcular
      </SubmitButton>
    </form>
  );
}

function CerrarForm({
  nominaId,
  disabled,
}: {
  nominaId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    cerrarNominaAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Nómina cerrada");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="nomina_id" value={nominaId} />
      <SubmitButton
        size="sm"
        loadingText="Cerrando…"
        className="gap-1.5"
        disabled={disabled}
      >
        <Lock className="h-3.5 w-3.5" />
        Cerrar
      </SubmitButton>
    </form>
  );
}

function Stat({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "mt-0.5 font-semibold tabular-nums " +
          (accent
            ? "text-success"
            : muted
              ? "text-muted-foreground"
              : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}
