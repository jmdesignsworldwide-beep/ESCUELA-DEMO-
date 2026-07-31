"use client";

import type { ReactNode } from "react";
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
  Megaphone,
  Bell,
  Award,
  ThumbsDown,
  Sparkles,
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
import type { CircularVisible } from "@/lib/comms/types";
import { TIPO_CIRCULAR_LABELS } from "@/lib/comms/types";
import type { ConductaPortal } from "@/lib/discipline/types";
import { GRAVEDAD_LABELS } from "@/lib/discipline/types";
import {
  MESES_ABREV,
  type AsistenciaMes,
  type AsistenciaPeriodo,
} from "@/lib/attendance/analytics-types";
import type { BoletinAreaRow } from "@/lib/competencias/types";

export function PortalView({
  esTutor,
  nombreUsuario,
  estudiantes,
  seleccionado,
  calificaciones,
  asistencia,
  asistenciaPct,
  asistenciaMensual,
  asistenciaPeriodo,
  asistenciaMinima,
  boletinAreas,
  periodoNombre,
  finanzas,
  circulares,
  conducta,
}: {
  esTutor: boolean;
  nombreUsuario: string;
  estudiantes: PortalEstudiante[];
  seleccionado: PortalEstudiante;
  calificaciones: PortalCalificacion[];
  asistencia: PortalAsistencia;
  asistenciaPct: number;
  asistenciaMensual: AsistenciaMes[];
  asistenciaPeriodo: AsistenciaPeriodo[];
  asistenciaMinima: number;
  boletinAreas: BoletinAreaRow[];
  periodoNombre: string;
  finanzas: PortalCargo[];
  circulares: CircularVisible[];
  conducta: ConductaPortal[];
}) {
  const saldoPendiente = finanzas
    .filter((c) => c.estado !== "pagado")
    .reduce((s, c) => s + c.monto, 0);
  const puntosConducta = conducta.reduce((s, c) => s + c.puntos, 0);
  const asisOk = asistenciaPct >= asistenciaMinima;
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

      {/* Tira de indicadores rápidos */}
      <div className="grid grid-cols-3 gap-2">
        <QuickStat
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Asistencia"
          value={`${asistenciaPct.toFixed(0)}%`}
          tone={asisOk ? "success" : "danger"}
        />
        <QuickStat
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="Saldo"
          value={saldoPendiente > 0 ? formatRD(saldoPendiente) : "Al día"}
          tone={saldoPendiente > 0 ? "danger" : "success"}
        />
        <QuickStat
          icon={<Sparkles className="h-4 w-4" />}
          label="Conducta"
          value={`${puntosConducta > 0 ? "+" : ""}${puntosConducta} pts`}
          tone={puntosConducta >= 0 ? "success" : "danger"}
        />
      </div>

      <Tabs defaultValue="academico">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="academico" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Académico</span>
          </TabsTrigger>
          <TabsTrigger value="asistencia" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Asistencia</span>
          </TabsTrigger>
          <TabsTrigger value="conducta" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Conducta</span>
          </TabsTrigger>
          <TabsTrigger value="finanzas" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Finanzas</span>
          </TabsTrigger>
          <TabsTrigger value="avisos" className="gap-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Avisos</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Académico (bloqueable por morosidad) ── */}
        <TabsContent value="academico" className="mt-3 space-y-3">
          {seleccionado.bloqueado ? (
            <BloqueoMorosidad pendiente={seleccionado.pendiente} />
          ) : (
            <>
              {boletinAreas.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Boletín por competencias
                    </CardTitle>
                    {periodoNombre && (
                      <p className="text-xs text-muted-foreground">
                        {periodoNombre} · Ordenanza 04-2023 (MINERD)
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {boletinAreas.map((a) => (
                      <div
                        key={a.asignatura_id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm">
                          {a.asignatura}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {a.banda && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
                              style={{
                                backgroundColor: `${a.color ?? "#5B6B7F"}1A`,
                                color: a.color ?? "#5B6B7F",
                              }}
                            >
                              {a.banda_corta ?? a.banda}
                            </span>
                          )}
                          <span
                            className={
                              "w-8 text-right font-semibold tabular-nums " +
                              (a.aprobada ? "text-success" : "text-destructive")
                            }
                          >
                            {a.nota_area}
                          </span>
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Promedios por asignatura
                  </CardTitle>
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
                            (c.promedio >= 70
                              ? "text-success"
                              : "text-destructive")
                          }
                        >
                          {c.promedio.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Asistencia (informativa, no se bloquea) ── */}
        <TabsContent value="asistencia" className="mt-3 space-y-3">
          {/* Semáforo anual */}
          {(() => {
            const enRegla = asistenciaPct >= asistenciaMinima;
            return (
              <Card
                className={
                  enRegla
                    ? "border-success/40 bg-success/5"
                    : "border-destructive/40 bg-destructive/5"
                }
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <div
                    className={
                      "flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white " +
                      (enRegla ? "bg-success" : "bg-destructive")
                    }
                  >
                    {asistenciaPct.toFixed(0)}%
                  </div>
                  <div>
                    <p className="font-serif text-lg font-semibold">
                      Asistencia del año
                    </p>
                    <p
                      className={
                        "text-sm font-medium " +
                        (enRegla ? "text-success" : "text-destructive")
                      }
                    >
                      {enRegla
                        ? "En regla — por encima del mínimo"
                        : `Atención — por debajo del ${asistenciaMinima}% requerido`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Por período */}
          {asistenciaPeriodo.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por período</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {asistenciaPeriodo.map((p) => {
                  const ok = p.pct >= asistenciaMinima;
                  return (
                    <div
                      key={p.orden}
                      className="rounded-lg border border-border p-2 text-center"
                    >
                      <p className="text-xs text-muted-foreground">
                        {p.orden}º período
                      </p>
                      <p
                        className={
                          "font-serif text-lg font-semibold " +
                          (ok ? "text-success" : "text-destructive")
                        }
                      >
                        {p.pct.toFixed(0)}%
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Por mes */}
          {asistenciaMensual.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Asistencia mensual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {asistenciaMensual.map((m) => {
                  const ok = m.pct >= asistenciaMinima;
                  return (
                    <div key={`${m.anio_cal}-${m.mes}`} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                        {MESES_ABREV[m.mes - 1]}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={"h-full rounded-full " + (ok ? "bg-success" : "bg-destructive")}
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                      <span
                        className={
                          "w-12 shrink-0 text-right text-xs font-semibold tabular-nums " +
                          (ok ? "text-success" : "text-destructive")
                        }
                      >
                        {m.pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Desglose */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Desglose del año</CardTitle>
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

        {/* ── Conducta (méritos/deméritos) ── */}
        <TabsContent value="conducta" className="mt-3 space-y-3">
          {(() => {
            const puntos = conducta.reduce((s, c) => s + c.puntos, 0);
            const meritos = conducta.filter((c) => c.categoria === "merito").length;
            const demeritos = conducta.length - meritos;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    Conducta
                    <span
                      className={
                        "font-serif text-xl " +
                        (puntos >= 0 ? "text-success" : "text-destructive")
                      }
                    >
                      {puntos > 0 ? `+${puntos}` : puntos} pts
                    </span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {meritos} mérito(s) · {demeritos} demérito(s)
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conducta.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Sin incidencias registradas. ¡Buen trabajo!
                    </p>
                  ) : (
                    conducta.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <div
                          className={
                            "mt-0.5 rounded-full p-1.5 " +
                            (c.categoria === "merito"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive")
                          }
                        >
                          {c.categoria === "merito" ? (
                            <Award className="h-4 w-4" />
                          ) : (
                            <ThumbsDown className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{c.titulo}</p>
                            <span
                              className={
                                "shrink-0 text-sm font-semibold tabular-nums " +
                                (c.puntos >= 0 ? "text-success" : "text-destructive")
                              }
                            >
                              {c.puntos > 0 ? `+${c.puntos}` : c.puntos}
                            </span>
                          </div>
                          {c.descripcion && (
                            <p className="text-xs text-muted-foreground">
                              {c.descripcion}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatFechaRD(new Date(c.fecha))}
                            {c.gravedad ? ` · ${GRAVEDAD_LABELS[c.gravedad]}` : ""}
                            {c.medida ? ` · ${c.medida}` : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* ── Finanzas (siempre visible) ── */}
        <TabsContent value="finanzas" className="mt-3">
          {(() => {
            const pendientes = finanzas
              .filter((c) => c.estado !== "pagado")
              .sort((a, b) =>
                (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"),
              );
            const proximo = pendientes[0];
            return (
              <Card
                className={
                  "mb-3 " +
                  (saldoPendiente > 0
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-success/40 bg-success/5")
                }
              >
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                    <p
                      className={
                        "font-serif text-2xl font-semibold " +
                        (saldoPendiente > 0 ? "text-destructive" : "text-success")
                      }
                    >
                      {saldoPendiente > 0 ? formatRD(saldoPendiente) : "Al día"}
                    </p>
                  </div>
                  {proximo?.vencimiento && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Próximo vencimiento
                      </p>
                      <p className="text-sm font-medium">
                        {formatFechaRD(new Date(proximo.vencimiento))}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalle de cargos</CardTitle>
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

        {/* ── Avisos / circulares (audiencia hermética) ── */}
        <TabsContent value="avisos" className="mt-3 space-y-3">
          {circulares.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Bell className="h-7 w-7 opacity-40" />
                <p className="text-sm">No hay avisos para ti por ahora.</p>
              </CardContent>
            </Card>
          ) : (
            circulares.map((c) => (
              <Card
                key={c.id}
                className={c.tipo === "urgente" ? "border-destructive/40" : ""}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {c.tipo === "urgente" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    ) : c.tipo === "aviso" ? (
                      <Bell className="h-4 w-4 shrink-0 text-warning" />
                    ) : (
                      <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    {c.titulo}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {TIPO_CIRCULAR_LABELS[c.tipo]}
                    {c.publicada_at
                      ? ` · ${formatFechaRD(new Date(c.publicada_at))}`
                      : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {c.cuerpo}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
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

function QuickStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "success" | "danger";
}) {
  const toneClass = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
      <span
        className={"mx-auto mb-0.5 flex w-fit items-center gap-1 " + toneClass}
      >
        {icon}
      </span>
      <p className={"truncate text-sm font-semibold " + toneClass}>{value}</p>
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
    </div>
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
