"use client";

import * as React from "react";
import { Users2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrearDialog } from "@/components/academico/crear-dialog";
import { crearSeccionAction } from "../actions";
import {
  MODALIDAD_LABELS,
  type Aula,
  type Grado,
  type Jornada,
  type Nivel,
  type Seccion,
} from "@/lib/academic/types";

export function SeccionesPanel({
  secciones,
  niveles,
  grados,
  jornadas,
  aulas,
  canWrite,
}: {
  secciones: Seccion[];
  niveles: Nivel[];
  grados: Grado[];
  jornadas: Jornada[];
  aulas: Aula[];
  canWrite: boolean;
}) {
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const jornadaPorId = new Map(jornadas.map((j) => [j.id, j]));
  const aulaPorId = new Map(aulas.map((a) => [a.id, a]));

  const gradosOrdenados = [...grados].sort((a, b) => {
    const na = nivelPorId.get(a.nivel_id)?.orden ?? 0;
    const nb = nivelPorId.get(b.nivel_id)?.orden ?? 0;
    return na - nb || a.orden - b.orden;
  });

  const filas = [...secciones].sort((a, b) => {
    const ga = gradoPorId.get(a.grado_id);
    const gb = gradoPorId.get(b.grado_id);
    const na = ga ? (nivelPorId.get(ga.nivel_id)?.orden ?? 0) : 0;
    const nb = gb ? (nivelPorId.get(gb.nivel_id)?.orden ?? 0) : 0;
    return na - nb || (ga?.orden ?? 0) - (gb?.orden ?? 0) ||
      a.nombre.localeCompare(b.nombre);
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            <CardTitle>Secciones</CardTitle>
          </div>
          <CardDescription>
            {secciones.length} secciones del año en curso.
          </CardDescription>
        </div>
        {canWrite && (
          <CrearDialog
            triggerLabel="Nueva sección"
            title="Nueva sección"
            description="Asocia grado, jornada y aula para el año activo."
            action={crearSeccionAction}
          >
            {(state) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Grado</Label>
                  <Select name="grado_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradosOrdenados.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {nivelPorId.get(g.nivel_id)?.nombre} · {g.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {state.fieldErrors?.grado_id && (
                    <p className="text-xs text-destructive">
                      {state.fieldErrors.grado_id[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sec-nombre">Nombre</Label>
                  <Input id="sec-nombre" name="nombre" placeholder="B" required />
                  {state.fieldErrors?.nombre && (
                    <p className="text-xs text-destructive">
                      {state.fieldErrors.nombre[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Jornada</Label>
                  <Select name="jornada_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {jornadas.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {state.fieldErrors?.jornada_id && (
                    <p className="text-xs text-destructive">
                      {state.fieldErrors.jornada_id[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Aula (opcional)</Label>
                  <Select name="aula_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      {aulas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modalidad (opcional)</Label>
                  <Select name="modalidad">
                    <SelectTrigger>
                      <SelectValue placeholder="N/A" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(MODALIDAD_LABELS) as (keyof typeof MODALIDAD_LABELS)[]
                      ).map((m) => (
                        <SelectItem key={m} value={m}>
                          {MODALIDAD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sec-cupo">Cupo</Label>
                  <Input
                    id="sec-cupo"
                    name="cupo"
                    type="number"
                    min={1}
                    defaultValue={30}
                    required
                  />
                  {state.fieldErrors?.cupo && (
                    <p className="text-xs text-destructive">
                      {state.fieldErrors.cupo[0]}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CrearDialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grado y sección</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Cupo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((s) => {
              const g = gradoPorId.get(s.grado_id);
              const nivel = g ? nivelPorId.get(g.nivel_id) : undefined;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {g?.nombre} &quot;{s.nombre}&quot;
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {nivel?.nombre ?? "—"}
                  </TableCell>
                  <TableCell>{jornadaPorId.get(s.jornada_id)?.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.aula_id ? aulaPorId.get(s.aula_id)?.nombre : "—"}
                  </TableCell>
                  <TableCell>
                    {s.modalidad ? (
                      <Badge variant="secondary">
                        {MODALIDAD_LABELS[s.modalidad]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{s.cupo}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
