"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  Search,
  UserCheck,
  UserX,
  LogOut,
  GraduationCap,
  ArrowLeftRight,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/ui/count-up";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import { cambiarEstadoAction, type ActionState } from "../estudiantes/actions";
import {
  registrarTransferenciaAction,
  type ActionState as TransfState,
} from "./actions";
import {
  ESTADO_ESTUDIANTE_LABELS,
  ESTADO_ESTUDIANTE_VARIANT,
  TIPO_MOVIMIENTO_LABELS,
  type EstadoEstudiante,
  type TipoMovimiento,
} from "@/lib/lifecycle/types";
import { formatFechaRD } from "@/lib/utils";

interface Est {
  id: string;
  nombre: string;
  codigo: string;
  rne: string | null;
  estado: EstadoEstudiante;
}
interface Mov {
  id: string;
  estudiante: string;
  codigo: string;
  tipo: TipoMovimiento;
  motivo: string | null;
  fecha: string;
}

const ESTADOS: EstadoEstudiante[] = [
  "activo",
  "inactivo",
  "retirado",
  "egresado",
  "transferido",
];
const ESTADO_ICON: Record<EstadoEstudiante, typeof UserCheck> = {
  activo: UserCheck,
  inactivo: UserX,
  retirado: LogOut,
  egresado: GraduationCap,
  transferido: ArrowLeftRight,
};

export function CicloVidaView({
  conteo,
  estudiantes,
  movimientos,
}: {
  conteo: { estado: EstadoEstudiante; cantidad: number }[];
  estudiantes: Est[];
  movimientos: Mov[];
}) {
  const conteoMap = new Map(conteo.map((c) => [c.estado, c.cantidad]));

  return (
    <Tabs defaultValue="estados" className="w-full">
      <TabsList className="mb-3">
        <TabsTrigger value="estados">Estados</TabsTrigger>
        <TabsTrigger value="rne">Buscar por RNE</TabsTrigger>
        <TabsTrigger value="transferencias">Transferencias</TabsTrigger>
      </TabsList>

      <TabsContent value="estados">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ESTADOS.map((e) => {
            const Icon = ESTADO_ICON[e];
            return (
              <Card key={e}>
                <CardContent className="flex items-center gap-3 py-4">
                  <span className="shrink-0 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {ESTADO_ESTUDIANTE_LABELS[e]}
                    </p>
                    <p className="font-serif text-xl font-semibold tabular-nums">
                      <CountUp value={conteoMap.get(e) ?? 0} />
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <TablaEstados estudiantes={estudiantes} />
      </TabsContent>

      <TabsContent value="rne">
        <BuscadorRne estudiantes={estudiantes} />
      </TabsContent>

      <TabsContent value="transferencias">
        <Transferencias estudiantes={estudiantes} movimientos={movimientos} />
      </TabsContent>
    </Tabs>
  );
}

// ── Estados: tabla + cambio de estado ──────────────────────────────────
function TablaEstados({ estudiantes }: { estudiantes: Est[] }) {
  const [filtro, setFiltro] = React.useState<EstadoEstudiante | "todos">("todos");
  const [target, setTarget] = React.useState<Est | null>(null);

  const lista = estudiantes
    .filter((e) => filtro === "todos" || e.estado === filtro)
    .slice(0, 200);

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Estudiantes</CardTitle>
          <CardDescription>
            Cambia el estado (retiro, inactivación, egreso o transferencia
            requieren motivo).
          </CardDescription>
        </div>
        <div className="w-full sm:w-56">
          <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_ESTUDIANTE_LABELS[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="border-b border-border p-2 text-left">Estudiante</th>
                <th className="border-b border-border p-2 text-left">Matrícula</th>
                <th className="border-b border-border p-2 text-left">RNE</th>
                <th className="border-b border-border p-2 text-center">Estado</th>
                <th className="border-b border-border p-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id}>
                  <td className="border-b border-border/60 p-2 font-medium">{e.nombre}</td>
                  <td className="border-b border-border/60 p-2 font-mono text-xs">{e.codigo}</td>
                  <td className="border-b border-border/60 p-2 font-mono text-xs">{e.rne ?? "—"}</td>
                  <td className="border-b border-border/60 p-2 text-center">
                    <Badge variant={ESTADO_ESTUDIANTE_VARIANT[e.estado]}>
                      {ESTADO_ESTUDIANTE_LABELS[e.estado]}
                    </Badge>
                  </td>
                  <td className="border-b border-border/60 p-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setTarget(e)}>
                      Cambiar estado
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      {target && (
        <CambiarEstadoDialog est={target} onClose={() => setTarget(null)} />
      )}
    </Card>
  );
}

function CambiarEstadoDialog({ est, onClose }: { est: Est; onClose: () => void }) {
  const [estado, setEstado] = React.useState<EstadoEstudiante>(
    est.estado === "activo" ? "retirado" : "activo",
  );
  const [state, formAction] = useFormState<ActionState, FormData>(
    cambiarEstadoAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) {
      toast.success("Estado actualizado");
      onClose();
    } else if (state.error) toast.error(state.error);
  }, [state, onClose]);

  const requiereMotivo = ["retirado", "inactivo", "egresado", "transferido"].includes(
    estado,
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado — {est.nombre}</DialogTitle>
          <DialogDescription>
            Estado actual:{" "}
            <strong>{ESTADO_ESTUDIANTE_LABELS[est.estado]}</strong>. El cambio
            queda registrado en la bitácora inmutable del estudiante.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="estudiante_id" value={est.id} />
          <div className="space-y-2">
            <Label>Nuevo estado</Label>
            <Select
              name="estado"
              value={estado}
              onValueChange={(v) => setEstado(v as EstadoEstudiante)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.filter((e) => e !== est.estado).map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_ESTUDIANTE_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo {requiereMotivo ? "(obligatorio)" : "(opcional)"}
            </Label>
            <Input
              id="motivo"
              name="motivo"
              placeholder="Motivo del cambio…"
              required={requiereMotivo}
              minLength={requiereMotivo ? 5 : undefined}
            />
          </div>
          <DialogFooter>
            <SubmitButton loadingText="Guardando…">Guardar cambio</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Buscador por RNE ────────────────────────────────────────────────────
function BuscadorRne({ estudiantes }: { estudiantes: Est[] }) {
  const [q, setQ] = React.useState("");
  const query = q.trim().toLowerCase();
  const res = query
    ? estudiantes
        .filter(
          (e) =>
            (e.rne ?? "").toLowerCase().includes(query) ||
            e.nombre.toLowerCase().includes(query) ||
            e.codigo.toLowerCase().includes(query),
        )
        .slice(0, 20)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          Buscar por RNE, matrícula o nombre
        </CardTitle>
        <CardDescription>
          Registro Nacional del Estudiante (RNE) del MINERD.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe el RNE, matrícula o nombre…"
          autoFocus
        />
        {query && res.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin coincidencias.
          </p>
        )}
        {res.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="border-b border-border p-2 text-left">RNE</th>
                  <th className="border-b border-border p-2 text-left">Estudiante</th>
                  <th className="border-b border-border p-2 text-left">Matrícula</th>
                  <th className="border-b border-border p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {res.map((e) => (
                  <tr key={e.id}>
                    <td className="border-b border-border/60 p-2 font-mono text-xs">{e.rne ?? "—"}</td>
                    <td className="border-b border-border/60 p-2 font-medium">{e.nombre}</td>
                    <td className="border-b border-border/60 p-2 font-mono text-xs">{e.codigo}</td>
                    <td className="border-b border-border/60 p-2 text-center">
                      <Badge variant={ESTADO_ESTUDIANTE_VARIANT[e.estado]}>
                        {ESTADO_ESTUDIANTE_LABELS[e.estado]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Transferencias: timeline + registrar entrante ──────────────────────
function Transferencias({
  estudiantes,
  movimientos,
}: {
  estudiantes: Est[];
  movimientos: Mov[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TransferenciaForm estudiantes={estudiantes} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Movimientos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin movimientos registrados.
            </p>
          ) : (
            <ol className="space-y-3">
              {movimientos.map((m) => (
                <li key={m.id} className="flex gap-3 border-l-2 border-border pl-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {TIPO_MOVIMIENTO_LABELS[m.tipo]} —{" "}
                      <span className="font-normal">{m.estudiante}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFechaRD(m.fecha)}
                      {m.motivo ? ` · ${m.motivo}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransferenciaForm({ estudiantes }: { estudiantes: Est[] }) {
  const [estId, setEstId] = React.useState("");
  const [colegio, setColegio] = React.useState("");
  const [anio, setAnio] = React.useState("");
  const [grado, setGrado] = React.useState("");
  const [materias, setMaterias] = React.useState<
    { asignatura: string; nota: string }[]
  >([{ asignatura: "", nota: "" }]);
  const [state, formAction] = useFormState<TransfState, FormData>(
    registrarTransferenciaAction,
    {},
  );
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.ok && !done.current) {
      done.current = true;
      toast.success("Transferencia y convalidaciones registradas");
      setColegio("");
      setAnio("");
      setGrado("");
      setMaterias([{ asignatura: "", nota: "" }]);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const setMat = (i: number, k: "asignatura" | "nota", v: string) =>
    setMaterias((prev) => prev.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  const payload = JSON.stringify({
    estudiante_id: estId,
    colegio_origen: colegio,
    anio_origen: anio || undefined,
    grado: grado || undefined,
    materias: materias
      .filter((m) => m.asignatura.trim() && m.nota !== "")
      .map((m) => ({ asignatura: m.asignatura, nota: parseFloat(m.nota) })),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          Transferencia entrante
        </CardTitle>
        <CardDescription>
          Convalida las notas del colegio de origen para un estudiante ya
          inscrito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="payload" value={payload} />
          <div className="space-y-1.5">
            <Label>Estudiante</Label>
            <Select value={estId} onValueChange={setEstId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {estudiantes.slice(0, 300).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} · {e.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Colegio de origen</Label>
              <Input value={colegio} onChange={(e) => setColegio(e.target.value)} placeholder="Nombre del centro" />
            </div>
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Input value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2024–2025" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Grado cursado</Label>
              <Input value={grado} onChange={(e) => setGrado(e.target.value)} placeholder="p. ej. 5to Primaria" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas a convalidar</Label>
            {materias.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={m.asignatura}
                  onChange={(e) => setMat(i, "asignatura", e.target.value)}
                  placeholder="Asignatura"
                  className="flex-1"
                />
                <Input
                  value={m.nota}
                  onChange={(e) => setMat(i, "nota", e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="Nota"
                  inputMode="decimal"
                  className="w-20"
                />
                {materias.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMaterias((p) => p.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMaterias((p) => [...p, { asignatura: "", nota: "" }])}
            >
              <Plus className="h-4 w-4" />
              Agregar asignatura
            </Button>
          </div>

          <SubmitButton
            className="w-full"
            loadingText="Registrando…"
            disabled={!estId || !colegio}
          >
            Registrar transferencia
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
