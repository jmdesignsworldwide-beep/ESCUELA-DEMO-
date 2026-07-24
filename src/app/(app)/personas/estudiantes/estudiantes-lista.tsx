"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ChevronRight, Users, UserCheck } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NuevoEstudianteDialog } from "./nuevo-estudiante-dialog";
import { initials } from "@/lib/utils";
import {
  ESTADO_ESTUDIANTE_LABELS,
  edad,
  type EstadoEstudiante,
  type SexoEstudiante,
} from "@/lib/students/types";
import type { Grado, Nivel, Seccion } from "@/lib/academic/types";

export interface EstudianteRow {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  sexo: SexoEstudiante;
  estado: EstadoEstudiante;
  fecha_nacimiento: string;
  rne: string | null;
  seccionLabel: string;
  nivelNombre: string;
  nivelOrden: number;
}

const ESTADO_VARIANT: Record<
  EstadoEstudiante,
  "success" | "secondary" | "warning" | "destructive"
> = {
  activo: "success",
  retirado: "destructive",
  egresado: "secondary",
  transferido: "warning",
};

const PAGE_SIZE = 24;

export function EstudiantesLista({
  rows,
  niveles,
  grados,
  secciones,
  canWrite,
}: {
  rows: EstudianteRow[];
  niveles: Nivel[];
  grados: Grado[];
  secciones: Seccion[];
  canWrite: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [nivel, setNivel] = React.useState<string>("todos");
  const [estado, setEstado] = React.useState<string>("todos");
  const [page, setPage] = React.useState(0);

  const filtradas = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (nivel !== "todos" && r.nivelNombre !== nivel) return false;
      if (estado !== "todos" && r.estado !== estado) return false;
      if (!term) return true;
      return (
        `${r.nombres} ${r.apellidos}`.toLowerCase().includes(term) ||
        r.codigo.toLowerCase().includes(term) ||
        (r.rne ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, nivel, estado]);

  React.useEffect(() => setPage(0), [q, nivel, estado]);

  const activos = rows.filter((r) => r.estado === "activo").length;
  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageRows = filtradas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Total" value={rows.length} />
        <Stat
          icon={<UserCheck className="h-4 w-4" />}
          label="Activos"
          value={activos}
          accent
        />
        {niveles.slice(0, 2).map((n) => (
          <Stat
            key={n.id}
            label={n.nombre}
            value={rows.filter((r) => r.nivelNombre === n.nombre).length}
          />
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, código o RNE…"
            className="pl-9"
            aria-label="Buscar estudiante"
          />
        </div>
        <Select value={nivel} onValueChange={setNivel}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los niveles</SelectItem>
            {niveles.map((n) => (
              <SelectItem key={n.id} value={n.nombre}>
                {n.nombre}
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
            {(
              Object.keys(ESTADO_ESTUDIANTE_LABELS) as EstadoEstudiante[]
            ).map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADO_ESTUDIANTE_LABELS[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite && (
          <NuevoEstudianteDialog
            niveles={niveles}
            grados={grados}
            secciones={secciones}
          />
        )}
      </div>

      {/* Tabla (escritorio) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/personas/estudiantes/${r.id}`}
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
                  <TableCell>{r.seccionLabel}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.nivelNombre}
                  </TableCell>
                  <TableCell>{edad(r.fecha_nacimiento)} años</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[r.estado]}>
                      {ESTADO_ESTUDIANTE_LABELS[r.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/personas/estudiantes/${r.id}`}
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

      {/* Tarjetas (móvil) */}
      <div className="grid gap-3 md:hidden">
        {pageRows.map((r) => (
          <Link key={r.id} href={`/personas/estudiantes/${r.id}`}>
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
                  <p className="text-xs text-muted-foreground">
                    {r.codigo} · {r.seccionLabel} · {r.nivelNombre}
                  </p>
                </div>
                <Badge variant={ESTADO_VARIANT[r.estado]}>
                  {ESTADO_ESTUDIANTE_LABELS[r.estado]}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtradas.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          No se encontraron estudiantes con esos criterios.
        </Card>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filtradas.length} resultados · página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
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
          (accent ? "text-success" : "text-foreground")
        }
      >
        {value}
      </p>
    </Card>
  );
}
