"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ChevronRight, GraduationCap, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NuevoEmpleadoDialog } from "./nuevo-empleado-dialog";
import { initials } from "@/lib/utils";
import {
  ESTADO_EMPLEADO_LABELS,
  TIPO_EMPLEADO_LABELS,
  type EstadoEmpleado,
  type TipoEmpleado,
} from "@/lib/staff/types";

export interface EmpleadoRow {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  tipo: TipoEmpleado;
  cargo: string;
  estado: EstadoEmpleado;
  asignaciones: number;
  horas: number;
}

const ESTADO_VARIANT: Record<
  EstadoEmpleado,
  "success" | "warning" | "secondary"
> = {
  activo: "success",
  licencia: "warning",
  inactivo: "secondary",
};

export function DocentesLista({
  rows,
  canWrite,
}: {
  rows: EmpleadoRow[];
  canWrite: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [tipo, setTipo] = React.useState("todos");
  const [estado, setEstado] = React.useState("todos");

  const filtradas = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tipo !== "todos" && r.tipo !== tipo) return false;
      if (estado !== "todos" && r.estado !== estado) return false;
      if (!term) return true;
      return (
        `${r.nombres} ${r.apellidos}`.toLowerCase().includes(term) ||
        r.codigo.toLowerCase().includes(term) ||
        r.cargo.toLowerCase().includes(term)
      );
    });
  }, [rows, q, tipo, estado]);

  const docentes = rows.filter((r) => r.tipo === "docente").length;
  const personal = rows.length - docentes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<GraduationCap className="h-4 w-4" />} label="Docentes" value={docentes} accent />
        <Stat icon={<Briefcase className="h-4 w-4" />} label="Personal" value={personal} />
        <Stat label="En licencia" value={rows.filter((r) => r.estado === "licencia").length} />
        <Stat label="Total" value={rows.length} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, código o cargo…"
            className="pl-9"
          />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {(Object.keys(TIPO_EMPLEADO_LABELS) as TipoEmpleado[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_EMPLEADO_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {(Object.keys(ESTADO_EMPLEADO_LABELS) as EstadoEmpleado[]).map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADO_EMPLEADO_LABELS[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite && <NuevoEmpleadoDialog />}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Carga</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/personas/docentes/${r.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>
                          {initials(`${r.nombres} ${r.apellidos}`)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {r.nombres} {r.apellidos}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell className="text-muted-foreground">{r.cargo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TIPO_EMPLEADO_LABELS[r.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.tipo === "docente" ? (
                      <span className="text-sm">
                        {r.asignaciones} asig. · {r.horas}h
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[r.estado]}>
                      {ESTADO_EMPLEADO_LABELS[r.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/personas/docentes/${r.id}`}
                      aria-label="Ver expediente"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:hidden">
        {filtradas.map((r) => (
          <Link key={r.id} href={`/personas/docentes/${r.id}`}>
            <Card className="p-4 transition-colors hover:border-gold/40">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback>
                    {initials(`${r.nombres} ${r.apellidos}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.nombres} {r.apellidos}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.codigo} · {r.cargo}
                  </p>
                </div>
                <Badge variant={ESTADO_VARIANT[r.estado]}>
                  {ESTADO_EMPLEADO_LABELS[r.estado]}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtradas.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          No se encontró personal con esos criterios.
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={
          "mt-1 font-serif text-2xl font-semibold " +
          (accent ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </p>
    </Card>
  );
}
