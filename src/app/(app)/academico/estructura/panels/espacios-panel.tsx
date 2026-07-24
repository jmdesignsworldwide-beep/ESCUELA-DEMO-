"use client";

import { Clock, DoorClosed } from "lucide-react";
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
import { CrearDialog } from "@/components/academico/crear-dialog";
import { crearAulaAction } from "../actions";
import type { Aula, Jornada } from "@/lib/academic/types";

export function EspaciosPanel({
  jornadas,
  aulas,
  canWrite,
}: {
  jornadas: Jornada[];
  aulas: Aula[];
  canWrite: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Jornadas</CardTitle>
          </div>
          <CardDescription>Tandas de clases del colegio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {jornadas.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <span className="font-medium">{j.nombre}</span>
              <Badge variant="outline">{j.codigo}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <DoorClosed className="h-5 w-5 text-primary" />
              <CardTitle>Aulas</CardTitle>
            </div>
            <CardDescription>
              {aulas.length} aulas · capacidad y ubicación.
            </CardDescription>
          </div>
          {canWrite && (
            <CrearDialog
              triggerLabel="Nueva aula"
              title="Nueva aula"
              description="Registra un aula con su capacidad."
              action={crearAulaAction}
            >
              {(state) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="aula-nombre">Nombre</Label>
                    <Input id="aula-nombre" name="nombre" placeholder="Aula 17" required />
                    {state.fieldErrors?.nombre && (
                      <p className="text-xs text-destructive">
                        {state.fieldErrors.nombre[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aula-codigo">Código</Label>
                    <Input id="aula-codigo" name="codigo" placeholder="A17" required />
                    {state.fieldErrors?.codigo && (
                      <p className="text-xs text-destructive">
                        {state.fieldErrors.codigo[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aula-capacidad">Capacidad</Label>
                    <Input
                      id="aula-capacidad"
                      name="capacidad"
                      type="number"
                      min={1}
                      defaultValue={30}
                      required
                    />
                    {state.fieldErrors?.capacidad && (
                      <p className="text-xs text-destructive">
                        {state.fieldErrors.capacidad[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="aula-ubicacion">Ubicación (opcional)</Label>
                    <Input
                      id="aula-ubicacion"
                      name="ubicacion"
                      placeholder="Pabellón C"
                    />
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
                <TableHead>Aula</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Ubicación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aulas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.codigo}</Badge>
                  </TableCell>
                  <TableCell>{a.capacidad}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.ubicacion ?? "—"}
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
