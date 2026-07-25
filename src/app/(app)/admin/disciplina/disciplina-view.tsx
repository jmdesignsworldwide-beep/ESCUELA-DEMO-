"use client";

import * as React from "react";
import { ThumbsUp, ThumbsDown, ShieldAlert, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CrearDialog } from "@/components/academico/crear-dialog";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";
import { crearIncidenciaAction } from "./actions";
import { formatFechaRD } from "@/lib/utils";
import {
  CATEGORIA_LABELS,
  GRAVEDAD_LABELS,
  type Incidencia,
} from "@/lib/discipline/types";

type Opt = { id: string; nombre: string };

export function DisciplinaView({
  canWrite,
  incidencias,
  estudiantes,
  nombres,
}: {
  canWrite: boolean;
  incidencias: Incidencia[];
  estudiantes: Opt[];
  nombres: Record<string, string>;
}) {
  const [filtro, setFiltro] = React.useState("");

  const meritos = incidencias.filter((i) => i.categoria === "merito").length;
  const demeritos = incidencias.filter((i) => i.categoria === "demerito").length;

  const lista = filtro
    ? incidencias.filter((i) =>
        (nombres[i.estudiante_id] ?? "")
          .toLowerCase()
          .includes(filtro.toLowerCase()),
      )
    : incidencias;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Stat
            icon={<ThumbsUp className="h-4 w-4 text-success" />}
            label="Méritos"
            value={meritos}
          />
          <Stat
            icon={<ThumbsDown className="h-4 w-4 text-destructive" />}
            label="Deméritos"
            value={demeritos}
          />
          <Stat label="Registros" value={incidencias.length} />
        </div>
        {canWrite && (
          <CrearDialog
            triggerLabel="Registrar incidencia"
            title="Registrar incidencia"
            description="Mérito o demérito. El registro es inmutable una vez guardado."
            action={crearIncidenciaAction}
            submitLabel="Registrar"
          >
            {(state) => (
              <IncidenciaFormFields state={state} estudiantes={estudiantes} />
            )}
          </CrearDialog>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Historial</CardTitle>
          <Input
            placeholder="Buscar estudiante…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-9 w-56"
          />
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <ShieldAlert className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sin incidencias registradas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Incidencia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.slice(0, 100).map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatFechaRD(new Date(i.fecha))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {nombres[i.estudiante_id] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{i.titulo}</p>
                        {i.medida && (
                          <p className="text-xs text-muted-foreground">
                            Medida: {i.medida}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {i.categoria === "merito" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Award className="h-3 w-3" /> Mérito
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            Demérito{i.gravedad ? ` · ${GRAVEDAD_LABELS[i.gravedad]}` : ""}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-semibold tabular-nums " +
                          (i.puntos >= 0 ? "text-success" : "text-destructive")
                        }
                      >
                        {i.puntos > 0 ? `+${i.puntos}` : i.puntos}
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

function IncidenciaFormFields({
  state,
  estudiantes,
}: {
  state: ActionState;
  estudiantes: Opt[];
}) {
  const [estudiante, setEstudiante] = React.useState("");
  const [categoria, setCategoria] = React.useState("merito");
  const [gravedad, setGravedad] = React.useState("leve");
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Estudiante</Label>
        <input type="hidden" name="estudiante_id" value={estudiante} />
        <Select value={estudiante} onValueChange={setEstudiante}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un estudiante" />
          </SelectTrigger>
          <SelectContent>
            {estudiantes.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fe.estudiante_id && (
          <p className="text-xs text-destructive">{fe.estudiante_id[0]}</p>
        )}
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
              <SelectItem value="merito">Mérito</SelectItem>
              <SelectItem value="demerito">Demérito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {categoria === "demerito" && (
          <div className="space-y-1.5">
            <Label>Gravedad</Label>
            <input type="hidden" name="gravedad" value={gravedad} />
            <Select value={gravedad} onValueChange={setGravedad}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GRAVEDAD_LABELS) as (keyof typeof GRAVEDAD_LABELS)[]).map(
                  (g) => (
                    <SelectItem key={g} value={g}>
                      {GRAVEDAD_LABELS[g]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {fe.gravedad && (
              <p className="text-xs text-destructive">{fe.gravedad[0]}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" maxLength={140} required />
        {fe.titulo && <p className="text-xs text-destructive">{fe.titulo[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" name="descripcion" rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="medida">Medida / acción tomada</Label>
        <Input id="medida" name="medida" maxLength={200} />
      </div>
      <p className="text-xs text-muted-foreground">
        {CATEGORIA_LABELS[categoria as "merito" | "demerito"]}: los puntos se
        asignan automáticamente según la gravedad.
      </p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border px-4 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-serif text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
