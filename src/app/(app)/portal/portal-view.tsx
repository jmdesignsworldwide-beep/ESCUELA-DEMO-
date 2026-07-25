"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  GraduationCap,
  ClipboardCheck,
  Wallet,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRD, formatFechaRD, initials } from "@/lib/utils";
import type {
  PortalEstudiante,
  PortalCalificacion,
  PortalAsistencia,
  PortalCargo,
} from "@/lib/portal/types";

export function PortalView({
  esTutor,
  nombreUsuario,
  estudiantes,
  seleccionado,
  calificaciones,
  asistencia,
  finanzas,
}: {
  esTutor: boolean;
  nombreUsuario: string;
  estudiantes: PortalEstudiante[];
  seleccionado: PortalEstudiante;
  calificaciones: PortalCalificacion[];
  asistencia: PortalAsistencia;
  finanzas: PortalCargo[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Saludo */}
      <div>
        <p className="text-sm text-muted-foreground">
          {esTutor ? "Portal de familia" : "Mi portal"}
        </p>
        <h1 className="font-serif text-2xl font-semibold">Hola, {nombreUsuario}</h1>
      </div>

      {/* Selector de estudiantes (para tutores con varios hijos) */}
      {estudiantes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {estudiantes.map((e) => (
            <button
              key={e.estudiante_id}
              onClick={() => router.replace(`${pathname}?e=${e.estudiante_id}`)}
              className={
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (e.estudiante_id === seleccionado.estudiante_id
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:bg-muted/50")
              }
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[0.6rem]">
                  {initials(`${e.nombres} ${e.apellidos}`)}
                </AvatarFallback>
              </Avatar>
              {e.nombres.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Ficha del estudiante */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-base">
              {initials(`${seleccionado.nombres} ${seleccionado.apellidos}`)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg font-semibold">
              {seleccionado.nombres} {seleccionado.apellidos}
            </p>
            <p className="text-sm text-muted-foreground">
              {seleccionado.nivel} · {seleccionado.seccion}
            </p>
          </div>
          {seleccionado.pendiente > 0 && (
            <Badge variant="outline" className="gap-1 whitespace-nowrap">
              <CircleDollarSign className="h-3.5 w-3.5" />
              {formatRD(seleccionado.pendiente)}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="academico">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="academico" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Académico</span>
          </TabsTrigger>
          <TabsTrigger value="asistencia" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Asistencia</span>
          </TabsTrigger>
          <TabsTrigger value="finanzas" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Finanzas</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Académico (bloqueable por morosidad) ── */}
        <TabsContent value="academico" className="mt-3">
          {seleccionado.bloqueado ? (
            <BloqueoMorosidad pendiente={seleccionado.pendiente} />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Calificaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {calificaciones.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aún no hay calificaciones publicadas.
                  </p>
                ) : (
                  calificaciones.map((c) => (
                    <div
                      key={c.asignatura}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="text-sm">{c.asignatura}</span>
                      <span
                        className={
                          "font-semibold tabular-nums " +
                          (c.promedio >= 70 ? "text-success" : "text-destructive")
                        }
                      >
                        {c.promedio.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Asistencia (informativa, no se bloquea) ── */}
        <TabsContent value="asistencia" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Resumen de asistencia
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <AsisStat label="Presente" value={asistencia.presente} good />
              <AsisStat label="Ausente" value={asistencia.ausente} bad />
              <AsisStat label="Tardanza" value={asistencia.tardanza} warn />
              <AsisStat label="Excusa" value={asistencia.excusa} />
              <AsisStat label="Retiro anticipado" value={asistencia.retiro} />
              <AsisStat label="Sesiones" value={asistencia.total} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Finanzas (siempre visible) ── */}
        <TabsContent value="finanzas" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estado de cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {finanzas.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin cargos registrados.
                </p>
              ) : (
                finanzas.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{c.concepto}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.vencimiento
                          ? `Vence ${formatFechaRD(new Date(c.vencimiento))}`
                          : "Sin vencimiento"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {c.estado === "pagado" ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Pagado
                        </Badge>
                      ) : c.vencido ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Vencido
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                      <span className="font-semibold tabular-nums">
                        {formatRD(c.monto)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BloqueoMorosidad({ pendiente }: { pendiente: number }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="font-serif text-lg font-semibold">
          Calificaciones no disponibles
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          El acceso a las calificaciones está temporalmente restringido por un
          saldo pendiente de <strong>{formatRD(pendiente)}</strong>. Ponte al
          día con la administración para restablecer el acceso.
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Consulta el estado de cuenta en la pestaña Finanzas.
        </div>
      </CardContent>
    </Card>
  );
}

function AsisStat({
  label,
  value,
  good,
  bad,
  warn,
}: {
  label: string;
  value: number;
  good?: boolean;
  bad?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p
        className={
          "font-serif text-2xl font-semibold tabular-nums " +
          (good
            ? "text-success"
            : bad
              ? "text-destructive"
              : warn
                ? "text-warning"
                : "text-foreground")
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
