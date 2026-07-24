"use client";

import { CalendarRange } from "lucide-react";
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
import { formatFechaRD } from "@/lib/utils";
import {
  ESTADO_PERIODO_LABELS,
  type EstadoPeriodo,
  type Periodo,
} from "@/lib/academic/types";

const ESTADO_VARIANT: Record<
  EstadoPeriodo,
  "success" | "warning" | "secondary"
> = {
  cerrado: "secondary",
  en_curso: "success",
  pendiente: "warning",
};

export function PeriodosPanel({ periodos }: { periodos: Periodo[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <CardTitle>Períodos del año escolar</CardTitle>
        </div>
        <CardDescription>
          Cuatro períodos (P1–P4). La calificación final es el promedio de los
          cuatro. Año dominicano: agosto → junio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <span className="mr-2 inline-flex h-6 w-8 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                    P{p.orden}
                  </span>
                  {p.nombre}
                </TableCell>
                <TableCell>{formatFechaRD(p.fecha_inicio)}</TableCell>
                <TableCell>{formatFechaRD(p.fecha_fin)}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANT[p.estado]}>
                    {ESTADO_PERIODO_LABELS[p.estado]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
