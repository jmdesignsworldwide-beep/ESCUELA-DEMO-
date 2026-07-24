"use client";

import * as React from "react";
import { BookMarked, Clock3, Library } from "lucide-react";
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
import { crearAsignaturaAction } from "../actions";
import type {
  Asignatura,
  Grado,
  Nivel,
  PensumItem,
} from "@/lib/academic/types";

export function AsignaturasPanel({
  asignaturas,
  grados,
  niveles,
  pensum,
  canWrite,
}: {
  asignaturas: Asignatura[];
  grados: Grado[];
  niveles: Nivel[];
  pensum: PensumItem[];
  canWrite: boolean;
}) {
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const asignaturaPorId = new Map(asignaturas.map((a) => [a.id, a]));

  const gradosConPensum = [...grados]
    .filter((g) => pensum.some((p) => p.grado_id === g.id))
    .sort((a, b) => {
      const na = nivelPorId.get(a.nivel_id)?.orden ?? 0;
      const nb = nivelPorId.get(b.nivel_id)?.orden ?? 0;
      return na - nb || a.orden - b.orden;
    });

  const [gradoSel, setGradoSel] = React.useState<string>(
    gradosConPensum[0]?.id ?? "",
  );

  const items = pensum
    .filter((p) => p.grado_id === gradoSel)
    .sort((a, b) => a.orden - b.orden);
  const totalHoras = items.reduce((s, p) => s + p.horas_semanales, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" />
              <CardTitle>Asignaturas</CardTitle>
            </div>
            <CardDescription>
              Pénsum base MINERD + asignaturas propias del colegio.
            </CardDescription>
          </div>
          {canWrite && (
            <CrearDialog
              triggerLabel="Nueva asignatura"
              title="Nueva asignatura"
              description="Agrega una asignatura propia del colegio."
              action={crearAsignaturaAction}
            >
              {(state) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="asig-nombre">Nombre</Label>
                    <Input
                      id="asig-nombre"
                      name="nombre"
                      placeholder="Robótica"
                      required
                    />
                    {state.fieldErrors?.nombre && (
                      <p className="text-xs text-destructive">
                        {state.fieldErrors.nombre[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asig-codigo">Código</Label>
                    <Input
                      id="asig-codigo"
                      name="codigo"
                      placeholder="ROB"
                      required
                    />
                    {state.fieldErrors?.codigo && (
                      <p className="text-xs text-destructive">
                        {state.fieldErrors.codigo[0]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asig-area">Área (opcional)</Label>
                    <Input id="asig-area" name="area" placeholder="Tecnología" />
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
                <TableHead>Asignatura</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asignaturas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.nombre}
                    {a.area && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {a.area}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.es_base ? "secondary" : "gold"}>
                      {a.es_base ? "MINERD" : "Propia"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            <CardTitle>Pénsum por grado</CardTitle>
          </div>
          <CardDescription>
            Asignaturas y carga horaria semanal por grado.
          </CardDescription>
          <div className="pt-2">
            <Select value={gradoSel} onValueChange={setGradoSel}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Selecciona un grado" />
              </SelectTrigger>
              <SelectContent>
                {gradosConPensum.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {nivelPorId.get(g.nivel_id)?.nombre} · {g.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asignatura</TableHead>
                <TableHead className="text-right">Horas/sem.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {asignaturaPorId.get(p.asignatura_id)?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.horas_semanales}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Total: <span className="font-semibold text-foreground">{totalHoras} h/sem.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
