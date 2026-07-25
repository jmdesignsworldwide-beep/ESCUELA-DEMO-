"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  Package,
  Library,
  BookOpen,
  ArrowLeftRight,
  Undo2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitButton } from "@/components/auth/submit-button";
import { CrearDialog } from "@/components/academico/crear-dialog";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";
import {
  crearItemAction,
  crearLibroAction,
  prestarAction,
  devolverAction,
  type SimpleState,
} from "./actions";
import { formatRD, formatFechaRD } from "@/lib/utils";
import {
  CATEGORIA_INV_LABELS,
  ESTADO_ACTIVO_LABELS,
  type InventarioItem,
  type LibroCatalogo,
  type CategoriaInventario,
  type EstadoActivo,
} from "@/lib/inventory/types";

type Opt = { id: string; nombre: string };
type PrestamoView = {
  id: string;
  libro: string;
  prestatario: string;
  fecha: string;
  vence: string | null;
};

export function InventarioView({
  canWrite,
  inventario,
  catalogo,
  prestamos,
  estudiantes,
}: {
  canWrite: boolean;
  inventario: InventarioItem[];
  catalogo: LibroCatalogo[];
  prestamos: PrestamoView[];
  estudiantes: Opt[];
}) {
  const valorTotal = inventario.reduce(
    (s, i) => s + i.cantidad * i.valor_unitario,
    0,
  );

  return (
    <Tabs defaultValue="inventario" className="space-y-4">
      <TabsList>
        <TabsTrigger value="inventario" className="gap-1.5">
          <Package className="h-4 w-4" /> Inventario
        </TabsTrigger>
        <TabsTrigger value="biblioteca" className="gap-1.5">
          <Library className="h-4 w-4" /> Biblioteca
        </TabsTrigger>
      </TabsList>

      {/* ── Inventario ── */}
      <TabsContent value="inventario" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <Stat label="Ítems" value={String(inventario.length)} />
            <Stat label="Valor estimado" value={formatRD(valorTotal)} />
          </div>
          {canWrite && (
            <CrearDialog
              triggerLabel="Nuevo ítem"
              title="Nuevo ítem de inventario"
              action={crearItemAction}
              submitLabel="Guardar"
            >
              {(state) => <ItemFormFields state={state} />}
            </CrearDialog>
          )}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Valor total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventario.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Sin ítems registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventario.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                        <TableCell className="font-medium">{i.nombre}</TableCell>
                        <TableCell>{CATEGORIA_INV_LABELS[i.categoria]}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {i.cantidad} {i.unidad}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {i.ubicacion ?? "—"}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={i.estado} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRD(i.cantidad * i.valor_unitario)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Biblioteca ── */}
      <TabsContent value="biblioteca" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <Stat label="Títulos" value={String(catalogo.length)} />
            <Stat label="Préstamos activos" value={String(prestamos.length)} />
          </div>
          {canWrite && (
            <CrearDialog
              triggerLabel="Nuevo libro"
              title="Agregar libro al catálogo"
              action={crearLibroAction}
              submitLabel="Guardar"
            >
              {(state) => <LibroFormFields state={state} />}
            </CrearDialog>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" /> Catálogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Prestados</TableHead>
                    <TableHead className="text-right">Disponibles</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogo.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Catálogo vacío.
                      </TableCell>
                    </TableRow>
                  ) : (
                    catalogo.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.titulo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {l.autor ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.ejemplares_total}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.prestados}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              "font-semibold tabular-nums " +
                              (l.disponibles > 0 ? "text-success" : "text-destructive")
                            }
                          >
                            {l.disponibles}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {canWrite && (
                            <PrestarDialog
                              libro={l}
                              estudiantes={estudiantes}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {prestamos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Préstamos activos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {prestamos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.libro}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.prestatario} · Prestado {formatFechaRD(new Date(p.fecha))}
                      {p.vence ? ` · Vence ${formatFechaRD(new Date(p.vence))}` : ""}
                    </p>
                  </div>
                  {canWrite && <DevolverForm prestamoId={p.id} />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

function PrestarDialog({
  libro,
  estudiantes,
}: {
  libro: LibroCatalogo;
  estudiantes: Opt[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<SimpleState, FormData>(
    prestarAction,
    {},
  );
  const [est, setEst] = React.useState("");
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Préstamo registrado");
      setOpen(false);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={libro.disponibles <= 0}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Prestar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prestar: {libro.titulo}</DialogTitle>
          <DialogDescription>
            {libro.disponibles} ejemplar(es) disponible(s).
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="libro_id" value={libro.id} />
          <input type="hidden" name="estudiante_id" value={est} />
          <div className="space-y-1.5">
            <Label htmlFor="prestatario">Se presta a</Label>
            <Input id="prestatario" name="prestatario" required maxLength={140} />
          </div>
          <div className="space-y-1.5">
            <Label>Estudiante (opcional)</Label>
            <Select value={est} onValueChange={setEst}>
              <SelectTrigger>
                <SelectValue placeholder="Vincular a un estudiante" />
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
          <div className="space-y-1.5">
            <Label htmlFor="vence">Fecha de vencimiento</Label>
            <Input id="vence" name="vence" type="date" />
          </div>
          <DialogFooter>
            <SubmitButton loadingText="Registrando…">Registrar préstamo</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DevolverForm({ prestamoId }: { prestamoId: string }) {
  const [state, formAction] = useFormState<SimpleState, FormData>(
    devolverAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Devolución registrada");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="prestamo_id" value={prestamoId} />
      <SubmitButton variant="outline" size="sm" loadingText="…" className="gap-1.5">
        <Undo2 className="h-3.5 w-3.5" />
        Devolver
      </SubmitButton>
    </form>
  );
}

function ItemFormFields({ state }: { state: ActionState }) {
  const [categoria, setCategoria] = React.useState("mobiliario");
  const [estado, setEstado] = React.useState("bueno");
  const fe = state.fieldErrors ?? {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="codigo">Código</Label>
          <Input id="codigo" name="codigo" required maxLength={40} />
          {fe.codigo && <p className="text-xs text-destructive">{fe.codigo[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required maxLength={140} />
          {fe.nombre && <p className="text-xs text-destructive">{fe.nombre[0]}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <input type="hidden" name="categoria" value={categoria} />
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORIA_INV_LABELS) as CategoriaInventario[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIA_INV_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <input type="hidden" name="estado" value={estado} />
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ESTADO_ACTIVO_LABELS) as EstadoActivo[]).map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_ACTIVO_LABELS[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input id="cantidad" name="cantidad" type="number" min={0} defaultValue={1} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unidad">Unidad</Label>
          <Input id="unidad" name="unidad" defaultValue="unidad" maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valor_unitario">Valor unitario</Label>
          <Input id="valor_unitario" name="valor_unitario" type="number" min={0} defaultValue={0} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ubicacion">Ubicación</Label>
        <Input id="ubicacion" name="ubicacion" maxLength={80} />
      </div>
    </div>
  );
}

function LibroFormFields({ state }: { state: ActionState }) {
  const fe = state.fieldErrors ?? {};
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" required maxLength={200} />
        {fe.titulo && <p className="text-xs text-destructive">{fe.titulo[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="autor">Autor</Label>
          <Input id="autor" name="autor" maxLength={140} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Input id="categoria" name="categoria" maxLength={80} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="isbn">ISBN</Label>
          <Input id="isbn" name="isbn" maxLength={30} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ejemplares_total">Ejemplares</Label>
          <Input id="ejemplares_total" name="ejemplares_total" type="number" min={0} defaultValue={1} />
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: EstadoActivo }) {
  const variant =
    estado === "bueno"
      ? "secondary"
      : estado === "baja" || estado === "malo"
        ? "destructive"
        : "outline";
  return <Badge variant={variant}>{ESTADO_ACTIVO_LABELS[estado]}</Badge>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-4 py-2">
      <p className="font-serif text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
