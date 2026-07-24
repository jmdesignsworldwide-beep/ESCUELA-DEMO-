"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Receipt, Wallet, Lock, Ban, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  registrarPagoAction,
  anularPagoAction,
  cerrarCajaAction,
  type PagoState,
  type SimpleState,
} from "./actions";
import { formatRD } from "@/lib/utils";
import {
  METODOS,
  METODO_LABELS,
  type CargoSaldo,
  type CierreCaja,
  type MetodoPago,
} from "@/lib/cashier/types";

interface PagoDiaRow {
  id: string;
  recibo: string;
  ncf: string;
  estudiante: string;
  metodo: MetodoPago;
  monto: number;
  anulado: boolean;
}

export function CajaView({
  canWrite,
  fecha,
  estudiantes,
  estudianteSel,
  familiaSel,
  cargos,
  pagosDia,
  cierre,
}: {
  canWrite: boolean;
  fecha: string;
  estudiantes: { id: string; nombre: string }[];
  estudianteSel: string;
  familiaSel: string | null;
  cargos: CargoSaldo[];
  pagosDia: PagoDiaRow[];
  cierre: CierreCaja | null;
}) {
  return (
    <Tabs defaultValue="cobrar" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="cobrar">Cobrar</TabsTrigger>
        <TabsTrigger value="dia">Pagos del día</TabsTrigger>
        <TabsTrigger value="cierre">Cierre de caja</TabsTrigger>
      </TabsList>

      <TabsContent value="cobrar">
        <Cobrar
          canWrite={canWrite}
          estudiantes={estudiantes}
          estudianteSel={estudianteSel}
          familiaSel={familiaSel}
          cargos={cargos}
        />
      </TabsContent>
      <TabsContent value="dia">
        <PagosDia pagos={pagosDia} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="cierre">
        <Cierre
          fecha={fecha}
          pagos={pagosDia}
          cierre={cierre}
          canWrite={canWrite}
        />
      </TabsContent>
    </Tabs>
  );
}

function Cobrar({
  canWrite,
  estudiantes,
  estudianteSel,
  familiaSel,
  cargos,
}: {
  canWrite: boolean;
  estudiantes: { id: string; nombre: string }[];
  estudianteSel: string;
  familiaSel: string | null;
  cargos: CargoSaldo[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, formAction] = useFormState<PagoState, FormData>(
    registrarPagoAction,
    {},
  );
  const [sel, setSel] = React.useState<Map<string, number>>(new Map());
  const [metodo, setMetodo] = React.useState<MetodoPago>("efectivo");
  const opened = React.useRef<string | null>(null);

  React.useEffect(() => {
    setSel(new Map());
  }, [estudianteSel]);

  React.useEffect(() => {
    if (state.ok && state.url && opened.current !== state.recibo) {
      opened.current = state.recibo ?? null;
      toast.success(`Pago registrado · ${state.recibo}`);
      window.open(state.url, "_blank");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const toggle = (cargoId: string, saldo: number) =>
    setSel((prev) => {
      const next = new Map(prev);
      if (next.has(cargoId)) next.delete(cargoId);
      else next.set(cargoId, saldo);
      return next;
    });

  const total = [...sel.values()].reduce((s, v) => s + (v || 0), 0);
  const payload = JSON.stringify({
    estudiante_id: estudianteSel,
    familia_id: familiaSel ?? "",
    metodo,
    referencia: "",
    aplicaciones: [...sel.entries()].map(([cargo_id, monto]) => ({
      cargo_id,
      monto,
    })),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Registrar pago
        </CardTitle>
        <CardDescription>
          Selecciona el estudiante y los cargos a cobrar. Admite pagos parciales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-md space-y-2">
          <Label>Estudiante</Label>
          <Select
            value={estudianteSel}
            onValueChange={(v) => router.replace(`${pathname}?estudiante=${v}`)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona…" />
            </SelectTrigger>
            <SelectContent>
              {estudiantes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {estudianteSel && cargos.length === 0 && (
          <p className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
            Este estudiante está al día. No tiene cargos pendientes.
          </p>
        )}

        {cargos.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">A pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargos.map((c) => {
                  const on = sel.has(c.cargo_id);
                  return (
                    <TableRow key={c.cargo_id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!canWrite}
                          onChange={() => toggle(c.cargo_id, c.saldo)}
                          className="h-4 w-4 accent-[rgb(11_46_79)]"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.descripcion}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRD(c.saldo)}
                      </TableCell>
                      <TableCell className="text-right">
                        {on ? (
                          <Input
                            type="number"
                            min={1}
                            max={c.saldo}
                            value={sel.get(c.cargo_id) ?? 0}
                            onChange={(e) =>
                              setSel((prev) =>
                                new Map(prev).set(
                                  c.cargo_id,
                                  Math.min(
                                    parseFloat(e.target.value) || 0,
                                    c.saldo,
                                  ),
                                ),
                              )
                            }
                            className="h-8 w-28 text-right"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Método</Label>
                  <Select
                    value={metodo}
                    onValueChange={(v) => setMetodo(v as MetodoPago)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {METODO_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm">
                  Total:{" "}
                  <span className="font-serif text-xl font-semibold text-primary">
                    {formatRD(total)}
                  </span>
                </p>
              </div>
              {canWrite && (
                <form action={formAction}>
                  <input type="hidden" name="payload" value={payload} />
                  <SubmitButton
                    variant="gold"
                    disabled={sel.size === 0 || total <= 0}
                    loadingText="Cobrando…"
                    className="gap-1.5"
                  >
                    <Receipt className="h-4 w-4" />
                    Cobrar y emitir recibo
                  </SubmitButton>
                </form>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PagosDia({
  pagos,
  canWrite,
}: {
  pagos: PagoDiaRow[];
  canWrite: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pagos del día</CardTitle>
        <CardDescription>{pagos.length} transacciones.</CardDescription>
      </CardHeader>
      <CardContent>
        {pagos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin pagos registrados hoy.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recibo / NCF</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((p) => (
                <TableRow key={p.id} className={p.anulado ? "opacity-60" : ""}>
                  <TableCell>
                    <a
                      href={`/documentos/recibo/${p.recibo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                    >
                      {p.recibo}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      {p.ncf}
                    </span>
                  </TableCell>
                  <TableCell>{p.estudiante}</TableCell>
                  <TableCell>{METODO_LABELS[p.metodo]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRD(p.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.anulado ? (
                      <Badge variant="destructive">Anulado</Badge>
                    ) : (
                      canWrite && <AnularDialog pagoId={p.id} recibo={p.recibo} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AnularDialog({ pagoId, recibo }: { pagoId: string; recibo: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<SimpleState, FormData>(
    anularPagoAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) {
      toast.success("Pago anulado con nota de crédito");
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive">
          <Ban className="h-3.5 w-3.5" />
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular pago {recibo}</DialogTitle>
          <DialogDescription>
            El pago no se borra: se emite una <strong>nota de crédito</strong>{" "}
            con tu justificación. Los cargos vuelven a su saldo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="pago_id" value={pagoId} />
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (obligatorio)</Label>
            <Input id="motivo" name="motivo" placeholder="Motivo de la anulación…" required minLength={5} />
          </div>
          <DialogFooter>
            <SubmitButton variant="destructive" loadingText="Anulando…">
              Emitir nota de crédito
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Cierre({
  fecha,
  pagos,
  cierre,
  canWrite,
}: {
  fecha: string;
  pagos: PagoDiaRow[];
  cierre: CierreCaja | null;
  canWrite: boolean;
}) {
  const [state, formAction] = useFormState<SimpleState, FormData>(
    cerrarCajaAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Caja cerrada");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const activos = pagos.filter((p) => !p.anulado);
  const porMetodo = (m: MetodoPago) =>
    activos.filter((p) => p.metodo === m).reduce((s, p) => s + p.monto, 0);
  const total = activos.reduce((s, p) => s + p.monto, 0);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-primary" />
          Arqueo del día
        </CardTitle>
        <CardDescription>{fecha}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {METODOS.map((m) => (
          <div key={m} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{METODO_LABELS[m]}</span>
            <span className="font-semibold tabular-nums">
              {formatRD(cierre ? (cierreMetodo(cierre, m)) : porMetodo(m))}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2 text-base">
          <span className="font-semibold">Total</span>
          <span className="font-serif text-xl font-semibold text-primary tabular-nums">
            {formatRD(cierre ? cierre.total : total)}
          </span>
        </div>

        <div className="pt-3">
          {cierre ? (
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Caja cerrada · {cierre.num_pagos} pagos
            </Badge>
          ) : canWrite ? (
            <form action={formAction}>
              <input type="hidden" name="fecha" value={fecha} />
              <SubmitButton variant="gold" loadingText="Cerrando…" className="gap-1.5">
                <Lock className="h-4 w-4" />
                Cerrar caja del día
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function cierreMetodo(c: CierreCaja, m: MetodoPago): number {
  switch (m) {
    case "efectivo":
      return c.total_efectivo;
    case "transferencia":
      return c.total_transferencia;
    case "tarjeta":
      return c.total_tarjeta;
    case "cheque":
      return c.total_cheque;
  }
}
