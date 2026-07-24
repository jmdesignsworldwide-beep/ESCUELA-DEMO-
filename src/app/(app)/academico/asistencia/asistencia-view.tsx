"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { Lock, TriangleAlert, CheckCheck, BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { guardarAsistenciaAction, type ActionState } from "./actions";
import {
  ESTADOS_ASISTENCIA,
  ESTADO_ASISTENCIA_CORTO,
  ESTADO_ASISTENCIA_LABELS,
  type EstadoAsistencia,
} from "@/lib/attendance/types";
import { cn } from "@/lib/utils";

interface Opcion {
  id: string;
  label: string;
}

const ESTADO_COLOR: Record<EstadoAsistencia, string> = {
  presente: "bg-success text-success-foreground",
  ausente: "bg-destructive text-destructive-foreground",
  tardanza: "bg-warning text-warning-foreground",
  excusa: "bg-primary-light text-white",
  retiro_anticipado: "bg-muted-foreground text-white",
};

export function AsistenciaView({
  secciones,
  seccionSel,
  fecha,
  roster,
  registros,
  cerrada,
  resumen,
  ausentismo,
}: {
  secciones: Opcion[];
  seccionSel: string;
  fecha: string;
  roster: { id: string; nombre: string }[];
  registros: { estudiante_id: string; estado: EstadoAsistencia }[];
  cerrada: boolean;
  resumen: {
    seccion_id: string;
    label: string;
    total: number;
    presentes: number;
    ausentes: number;
    tardanzas: number;
    otros: number;
  }[];
  ausentismo: { estudiante_id: string; ausencias: number; nombre: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const navegar = (nextSeccion: string, nextFecha: string) => {
    const params = new URLSearchParams();
    params.set("seccion", nextSeccion);
    params.set("fecha", nextFecha);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs defaultValue="pase" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="pase">Pase de lista</TabsTrigger>
        <TabsTrigger value="ausentismo" className="gap-1.5">
          Ausentismo
          {ausentismo.length > 0 && (
            <span className="rounded-full bg-destructive px-1.5 text-[0.65rem] font-bold text-destructive-foreground">
              {ausentismo.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="reporte">Reporte</TabsTrigger>
      </TabsList>

      <TabsContent value="pase">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Sección</Label>
            <Select
              value={seccionSel}
              onValueChange={(v) => navegar(v, fecha)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
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
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => navegar(seccionSel, e.target.value)}
              className="sm:w-44"
            />
          </div>
        </div>

        <PaseDeLista
          key={`${seccionSel}:${fecha}`}
          seccionId={seccionSel}
          fecha={fecha}
          roster={roster}
          registros={registros}
          cerrada={cerrada}
        />
      </TabsContent>

      <TabsContent value="ausentismo">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TriangleAlert className="h-5 w-5 text-warning" />
              Alerta de ausentismo
            </CardTitle>
            <CardDescription>
              Estudiantes con 3 o más ausencias registradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ausentismo.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin alertas de ausentismo.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-right">Ausencias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ausentismo.map((a) => (
                    <TableRow key={a.estudiante_id}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{a.ausencias}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reporte">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Reporte de asistencia por sección
            </CardTitle>
            <CardDescription>
              Porcentaje de presencia sobre el total de registros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sección</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Ausencias</TableHead>
                  <TableHead className="text-right">Tardanzas</TableHead>
                  <TableHead className="text-right">% Asistencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.map((r) => {
                  const pct =
                    r.total > 0
                      ? Math.round((r.presentes / r.total) * 1000) / 10
                      : 0;
                  return (
                    <TableRow key={r.seccion_id}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right">{r.total}</TableCell>
                      <TableCell className="text-right">{r.ausentes}</TableCell>
                      <TableCell className="text-right">{r.tardanzas}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            pct >= 90
                              ? "success"
                              : pct >= 80
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {pct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function PaseDeLista({
  seccionId,
  fecha,
  roster,
  registros,
  cerrada,
}: {
  seccionId: string;
  fecha: string;
  roster: { id: string; nombre: string }[];
  registros: { estudiante_id: string; estado: EstadoAsistencia }[];
  cerrada: boolean;
}) {
  const inicial = new Map<string, EstadoAsistencia>(
    roster.map((e) => [e.id, "presente"]),
  );
  for (const r of registros) inicial.set(r.estudiante_id, r.estado);

  const [estados, setEstados] = React.useState<Map<string, EstadoAsistencia>>(
    inicial,
  );
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarAsistenciaAction,
    {},
  );
  const handled = React.useRef(false);

  React.useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success("Asistencia guardada");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (roster.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Esta sección no tiene estudiantes matriculados.
      </Card>
    );
  }

  const set = (id: string, estado: EstadoAsistencia) =>
    setEstados((prev) => new Map(prev).set(id, estado));
  const todosPresentes = () =>
    setEstados(new Map(roster.map((e) => [e.id, "presente"])));

  const payload = JSON.stringify({
    seccion_id: seccionId,
    fecha,
    registros: roster.map((e) => ({
      estudiante_id: e.id,
      estado: estados.get(e.id) ?? "presente",
    })),
  });

  const presentes = roster.filter(
    (e) => (estados.get(e.id) ?? "presente") === "presente",
  ).length;

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">
            {roster.length} estudiantes · {presentes} presentes
          </CardTitle>
          <CardDescription>
            {cerrada
              ? "Registro cerrado — inmutable."
              : "Marca el estado de cada estudiante y guarda."}
          </CardDescription>
        </div>
        {cerrada ? (
          <Badge variant="secondary" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Cerrado
          </Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={todosPresentes} className="gap-1.5">
            <CheckCheck className="h-4 w-4" />
            Todos presentes
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {roster.map((e) => {
            const actual = estados.get(e.id) ?? "presente";
            return (
              <li
                key={e.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{e.nombre}</span>
                <div className="flex flex-wrap gap-1.5">
                  {ESTADOS_ASISTENCIA.map((st) => {
                    const activo = actual === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={cerrada}
                        onClick={() => set(e.id, st)}
                        title={ESTADO_ASISTENCIA_LABELS[st]}
                        aria-pressed={activo}
                        className={cn(
                          "h-10 min-w-[2.5rem] rounded-lg border text-sm font-semibold transition-all disabled:opacity-70",
                          activo
                            ? `${ESTADO_COLOR[st]} border-transparent shadow-sm`
                            : "border-border bg-card text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {ESTADO_ASISTENCIA_CORTO[st]}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        {!cerrada && (
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <form action={formAction}>
              <input type="hidden" name="payload" value={payload} />
              <input type="hidden" name="cerrar" value="0" />
              <SubmitButton variant="outline" loadingText="Guardando…">
                Guardar
              </SubmitButton>
            </form>
            <form action={formAction}>
              <input type="hidden" name="payload" value={payload} />
              <input type="hidden" name="cerrar" value="1" />
              <SubmitButton variant="gold" loadingText="Cerrando…">
                Guardar y cerrar
              </SubmitButton>
            </form>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {ESTADOS_ASISTENCIA.map((st) => (
            <span key={st} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded text-[0.65rem] font-bold",
                  ESTADO_COLOR[st],
                )}
              >
                {ESTADO_ASISTENCIA_CORTO[st]}
              </span>
              {ESTADO_ASISTENCIA_LABELS[st]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
