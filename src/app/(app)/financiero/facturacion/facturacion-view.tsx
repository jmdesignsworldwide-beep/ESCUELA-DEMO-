"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Users, Percent, CalendarPlus, Wallet, ChevronRight } from "lucide-react";
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
  generarMensualidadAction,
  crearBecaAction,
  actualizarConceptoAction,
  type ActionState,
} from "./actions";
import { formatRD } from "@/lib/utils";
import {
  MESES,
  TIPO_BECA_LABELS,
  ESTADO_CARGO_LABELS,
  type ConfigFinanciera,
  type ConceptoCobro,
  type EstadoCargo,
  type ResumenFamilia,
  type TipoBeca,
} from "@/lib/finance/types";

interface BecaRow {
  id: string;
  estudiante: string;
  tipo: TipoBeca;
  porcentaje: number;
  motivo: string | null;
}
interface CargoRow {
  id: string;
  estudiante: string;
  descripcion: string;
  monto_base: number;
  descuento: number;
  monto: number;
  estado: EstadoCargo;
  vencimiento: string | null;
}

export function FacturacionView({
  canWrite,
  config,
  conceptos,
  becas,
  familias,
  familiaSel,
  cargosFamilia,
  estudiantes,
}: {
  canWrite: boolean;
  config: ConfigFinanciera | null;
  conceptos: ConceptoCobro[];
  becas: BecaRow[];
  familias: ResumenFamilia[];
  familiaSel: string;
  cargosFamilia: CargoRow[];
  estudiantes: { id: string; nombre: string }[];
}) {
  return (
    <Tabs defaultValue="cuenta" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="cuenta">Estado de cuenta</TabsTrigger>
        <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
        <TabsTrigger value="becas">Becas</TabsTrigger>
        <TabsTrigger value="generar">Generar cargos</TabsTrigger>
      </TabsList>

      <TabsContent value="cuenta">
        <EstadoCuenta
          familias={familias}
          familiaSel={familiaSel}
          cargos={cargosFamilia}
        />
      </TabsContent>
      <TabsContent value="conceptos">
        <Conceptos conceptos={conceptos} config={config} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="becas">
        <Becas becas={becas} estudiantes={estudiantes} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="generar">
        <Generar canWrite={canWrite} />
      </TabsContent>
    </Tabs>
  );
}

function EstadoCuenta({
  familias,
  familiaSel,
  cargos,
}: {
  familias: ResumenFamilia[];
  familiaSel: string;
  cargos: CargoRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const porEstudiante = new Map<string, CargoRow[]>();
  for (const c of cargos) {
    porEstudiante.set(c.estudiante, [...(porEstudiante.get(c.estudiante) ?? []), c]);
  }
  const totalNeto = cargos.reduce((s, c) => s + c.monto, 0);
  const totalDesc = cargos.reduce((s, c) => s + c.descuento, 0);
  const totalPend = cargos
    .filter((c) => c.estado === "pendiente" || c.estado === "parcial")
    .reduce((s, c) => s + c.monto, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Familias con saldo</CardTitle>
          </div>
          <CardDescription>{familias.length} familias.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[28rem] space-y-1 overflow-y-auto">
          {familias.map((f) => (
            <button
              key={f.familia_id}
              onClick={() => router.replace(`${pathname}?familia=${f.familia_id}`)}
              className={
                "flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-colors " +
                (familiaSel === f.familia_id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40")
              }
            >
              <div>
                <p className="text-sm font-medium">Familia {f.apellido}</p>
                <p className="text-xs text-muted-foreground">
                  {f.estudiantes} estudiante(s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatRD(f.pendiente)}
                </p>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {familiaSel ? "Estado de cuenta consolidado" : "Selecciona una familia"}
          </CardTitle>
          {familiaSel && (
            <CardDescription>
              Neto {formatRD(totalNeto)} · Descuentos {formatRD(totalDesc)} ·
              Pendiente {formatRD(totalPend)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!familiaSel ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Elige una familia para ver el estado consolidado con el descuento
              por hermanos aplicado.
            </p>
          ) : (
            [...porEstudiante.entries()].map(([est, list]) => (
              <div key={est} className="mb-4">
                <p className="mb-1 font-serif text-sm font-semibold text-primary">
                  {est}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Desc.</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.descripcion}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRD(c.monto_base)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-success">
                          {c.descuento > 0 ? `−${formatRD(c.descuento)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatRD(c.monto)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={c.estado === "pagado" ? "success" : "warning"}
                          >
                            {ESTADO_CARGO_LABELS[c.estado]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Conceptos({
  conceptos,
  config,
  canWrite,
}: {
  conceptos: ConceptoCobro[];
  config: ConfigFinanciera | null;
  canWrite: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conceptos de cobro</CardTitle>
          <CardDescription>Montos en RD$ (editable).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Recurrente</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {conceptos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={c.recurrente ? "secondary" : "outline"}>
                      {c.recurrente ? "Mensual" : "Único"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRD(c.monto)}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <ConceptoEditor id={c.id} monto={c.monto} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Fila label="Moneda" valor={config?.moneda ?? "RD$"} />
          <Fila label="Mensualidades" valor={String(config?.num_mensualidades ?? 10)} />
          <Fila label="Día de vencimiento" valor={String(config?.dia_vencimiento ?? 5)} />
          <div className="my-2 border-t border-border" />
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Percent className="h-3.5 w-3.5" /> Descuento por hermanos
          </p>
          <Fila label="2do hijo" valor={`${config?.desc_2do ?? 10}%`} />
          <Fila label="3er hijo" valor={`${config?.desc_3ro ?? 15}%`} />
          <Fila label="4to hijo en adelante" valor={`${config?.desc_4to ?? 20}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  );
}

function ConceptoEditor({ id, monto }: { id: string; monto: number }) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    actualizarConceptoAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Concepto actualizado");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="concepto_id" value={id} />
      <Input
        name="monto"
        type="number"
        min={0}
        step="1"
        defaultValue={monto}
        className="h-8 w-28 text-right"
      />
      <SubmitButton size="sm" variant="outline" loadingText="…">
        Guardar
      </SubmitButton>
    </form>
  );
}

function Becas({
  becas,
  estudiantes,
  canWrite,
}: {
  becas: BecaRow[];
  estudiantes: { id: string; nombre: string }[];
  canWrite: boolean;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    crearBecaAction,
    {},
  );
  const [tipo, setTipo] = React.useState<TipoBeca>("media");
  React.useEffect(() => {
    if (state.ok) toast.success("Beca registrada");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Becas activas</CardTitle>
          <CardDescription>{becas.length} estudiantes becados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {becas.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.estudiante}</TableCell>
                  <TableCell>
                    <Badge variant="gold">{TIPO_BECA_LABELS[b.tipo]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{b.porcentaje}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrar beca</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-3">
              <div className="space-y-2">
                <Label>Estudiante</Label>
                <Select name="estudiante_id" required>
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
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  name="tipo"
                  value={tipo}
                  onValueChange={(v) => setTipo(v as TipoBeca)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_BECA_LABELS) as TipoBeca[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_BECA_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje">Porcentaje</Label>
                <Input
                  id="porcentaje"
                  name="porcentaje"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={50}
                  disabled={tipo !== "porcentaje"}
                />
                {tipo !== "porcentaje" && (
                  <p className="text-xs text-muted-foreground">
                    {tipo === "completa" ? "100%" : "50%"} automático.
                  </p>
                )}
              </div>
              <Input name="motivo" placeholder="Motivo (opcional)" />
              <SubmitButton loadingText="Guardando…" className="w-full">
                Registrar beca
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Generar({ canWrite }: { canWrite: boolean }) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    generarMensualidadAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success(state.mensaje ?? "Cargos generados");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Generación masiva de mensualidad</CardTitle>
        </div>
        <CardDescription>
          Genera la mensualidad del mes para todos los estudiantes activos, con
          descuento por hermanos y becas aplicados automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canWrite ? (
          <p className="text-sm text-muted-foreground">
            Solo dirección/contabilidad puede generar cargos.
          </p>
        ) : (
          <form action={formAction} className="flex items-end gap-3">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select name="mes" required>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.n} value={String(m.n)}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SubmitButton loadingText="Generando…" className="gap-1.5">
              <Wallet className="h-4 w-4" />
              Generar
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
