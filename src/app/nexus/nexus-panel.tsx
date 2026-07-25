"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  UserPlus,
  RefreshCcw,
  Ban,
  Infinity as InfinityIcon,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  crearAccesoAction,
  renovarAccesoAction,
  revocarAccesoAction,
  resembrarDemoAction,
  type NexusState,
} from "./actions";
import { formatFechaRD } from "@/lib/utils";
import {
  ESTADO_ACCESO_LABELS,
  type AccesoDemo,
  type EstadoAcceso,
} from "@/lib/nexus/types";

const VIGENCIAS = [
  { label: "7 días", dias: 7 },
  { label: "15 días", dias: 15 },
  { label: "30 días", dias: 30 },
  { label: "Personalizado", dias: -1 },
  { label: "Sin vencimiento", dias: 0 },
];

export function NexusPanel({ accesos }: { accesos: AccesoDemo[] }) {
  const vigentes = accesos.filter((a) => a.estado === "vigente" || a.estado === "ilimitada").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Cuentas de acceso</h1>
          <p className="text-sm text-muted-foreground">
            {accesos.length} cuenta(s) · {vigentes} con acceso activo
          </p>
        </div>
        <div className="flex gap-2">
          <ResembrarButton />
          <CrearAccesoDialog />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {accesos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aún no has creado cuentas de acceso demo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / etiqueta</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead className="text-right">Restante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accesos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.etiqueta}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.vence_at ? (
                          formatFechaRD(new Date(a.vence_at))
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <InfinityIcon className="h-3.5 w-3.5" /> —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.estado === "ilimitada" ? (
                          "∞"
                        ) : a.dias_restantes === null ? (
                          "—"
                        ) : a.dias_restantes < 0 ? (
                          <span className="text-destructive">vencida</span>
                        ) : (
                          <span
                            className={
                              a.dias_restantes <= 3 ? "font-semibold text-warning" : ""
                            }
                          >
                            {a.dias_restantes} d
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={a.estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <RenovarDialog acceso={a} />
                          {a.activa && <RevocarForm id={a.id} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VigenciaPicker({
  dias,
  setDias,
  custom,
  setCustom,
}: {
  dias: number;
  setDias: (n: number) => void;
  custom: string;
  setCustom: (s: string) => void;
}) {
  const sinVenc = dias === 0 ? "si" : "no";
  const diasValor = dias === 0 || dias === -1 ? custom : String(dias);
  return (
    <div className="space-y-2">
      <Label>Vigencia</Label>
      <input type="hidden" name="sin_vencimiento" value={sinVenc} />
      <input
        type="hidden"
        name="dias"
        value={dias === 0 ? "" : dias === -1 ? custom : String(dias)}
      />
      <div className="flex flex-wrap gap-1.5">
        {VIGENCIAS.map((v) => (
          <button
            key={v.label}
            type="button"
            onClick={() => setDias(v.dias)}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (dias === v.dias
                ? "border-primary bg-primary/5 font-medium"
                : "border-border hover:bg-muted/50")
            }
          >
            {v.label}
          </button>
        ))}
      </div>
      {dias === -1 && (
        <Input
          type="number"
          min={1}
          max={3650}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Número de días"
          className="mt-1 w-40"
        />
      )}
      {sinVenc === "no" && dias !== -1 && diasValor && (
        <p className="text-xs text-muted-foreground">
          Vence aprox. en {diasValor} días desde hoy.
        </p>
      )}
    </div>
  );
}

function CrearAccesoDialog() {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<NexusState, FormData>(
    crearAccesoAction,
    {},
  );
  const [dias, setDias] = React.useState(15);
  const [custom, setCustom] = React.useState("");
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Acceso creado");
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Nueva cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cuenta de acceso demo</DialogTitle>
          <DialogDescription>
            El cliente entra con estas credenciales. La vigencia se valida en
            servidor.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="etiqueta">Cliente / etiqueta</Label>
            <Input id="etiqueta" name="etiqueta" required maxLength={120} placeholder="Colegio Ejemplo — demo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Usuario (correo)</Label>
              <Input id="email" name="email" type="email" required autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="text" required minLength={6} autoComplete="off" />
            </div>
          </div>
          <VigenciaPicker dias={dias} setDias={setDias} custom={custom} setCustom={setCustom} />
          <DialogFooter>
            <SubmitButton loadingText="Creando…">Crear acceso</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenovarDialog({ acceso }: { acceso: AccesoDemo }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<NexusState, FormData>(
    renovarAccesoAction,
    {},
  );
  const [dias, setDias] = React.useState(15);
  const [custom, setCustom] = React.useState("");
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Acceso renovado");
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Renovar</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renovar: {acceso.etiqueta}</DialogTitle>
          <DialogDescription>
            Extiende la vigencia (desde hoy o desde el vencimiento futuro) y
            reactiva la cuenta.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={acceso.id} />
          <VigenciaPicker dias={dias} setDias={setDias} custom={custom} setCustom={setCustom} />
          <DialogFooter>
            <SubmitButton loadingText="Renovando…">Aplicar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevocarForm({ id }: { id: string }) {
  const [state, formAction] = useFormState<NexusState, FormData>(
    revocarAccesoAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Acceso revocado");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        variant="ghost"
        size="sm"
        loadingText="…"
        className="gap-1.5 text-destructive hover:text-destructive"
      >
        <Ban className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Revocar</span>
      </SubmitButton>
    </form>
  );
}

function ResembrarButton() {
  const [state, formAction] = useFormState<NexusState, FormData>(
    resembrarDemoAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Demo restaurado a su estado base");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <SubmitButton variant="outline" size="sm" loadingText="Restaurando…" className="gap-1.5">
        <RotateCcw className="h-4 w-4" />
        <span className="hidden sm:inline">Resembrar demo</span>
      </SubmitButton>
    </form>
  );
}

function EstadoBadge({ estado }: { estado: EstadoAcceso }) {
  const map: Record<EstadoAcceso, { variant: "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    vigente: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    ilimitada: { variant: "secondary", icon: <InfinityIcon className="h-3 w-3" /> },
    vencida: { variant: "destructive", icon: <Clock className="h-3 w-3" /> },
    revocada: { variant: "outline", icon: <Ban className="h-3 w-3" /> },
  };
  const { variant, icon } = map[estado];
  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {ESTADO_ACCESO_LABELS[estado]}
    </Badge>
  );
}
