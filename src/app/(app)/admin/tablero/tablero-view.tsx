"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  UserCog,
  GaugeCircle,
  GraduationCap,
  Wallet,
  AlertTriangle,
  CalendarCheck,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { formatRD } from "@/lib/utils";
import {
  SEVERIDAD_STYLES,
  TONO_STYLES,
  tonoAscendente,
  type AlertaEjecutiva,
  type TableroEjecutivo,
  type Tono,
} from "@/lib/tablero/types";

export function TableroView({
  tablero,
  alertas,
}: {
  tablero: TableroEjecutivo;
  alertas: AlertaEjecutiva[];
}) {
  const t = tablero;
  const altas = alertas.filter((a) => a.severidad === "alta").length;

  return (
    <div className="space-y-5">
      {/* Estado general */}
      <EstadoGeneral altas={altas} totalAlertas={alertas.length} />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Estudiantes activos"
          value={<CountUp value={t.estudiantes_activos} />}
        />
        <KpiCard
          icon={UserCog}
          label="Docentes activos"
          value={<CountUp value={t.docentes_activos} />}
        />
        <KpiCard
          icon={GraduationCap}
          label="Promedio general"
          value={
            t.promedio_general == null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <CountUp value={t.promedio_general} decimals={1} />
            )
          }
        />
        <KpiCard
          icon={GaugeCircle}
          label="Ocupación de plazas"
          value={<CountUp value={t.ocupacion_pct} decimals={1} suffix="%" />}
          hint={`${t.estudiantes_activos} / ${t.cupo_total} cupos`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Salud por dominio */}
        <div className="space-y-4">
          {/* Financiero */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-primary" /> Salud financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Gauge
                label="Tasa de cobro del mes"
                pct={t.tasa_cobro_mes}
                tono={tonoAscendente(t.tasa_cobro_mes, 85, 70)}
                caption={`${formatRD(t.cobrado_mes)} cobrado de ${formatRD(
                  t.esperado_mes,
                )} esperado`}
              />
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  tono="critico"
                  icon={AlertTriangle}
                  label="Morosidad total"
                  value={formatRD(t.morosidad_saldo)}
                  hint={`${t.familias_morosas} de ${t.familias_total} familias`}
                />
                <MetricBox
                  tono="critico"
                  icon={AlertTriangle}
                  label="Cartera +90 días"
                  value={formatRD(t.deuda_90mas)}
                  hint="Deuda vencida crítica"
                />
              </div>
            </CardContent>
          </Card>

          {/* Académico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-4 w-4 text-primary" /> Salud
                académica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Gauge
                label="Asistencia global"
                pct={t.asistencia_pct}
                tono={tonoAscendente(t.asistencia_pct, 92, 85)}
                caption="Umbral MINERD para promoción: 80%"
              />
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  tono={t.riesgo_asistencia > 0 ? "atencion" : "bueno"}
                  icon={AlertTriangle}
                  label="Riesgo por inasistencia"
                  value={<CountUp value={t.riesgo_asistencia} />}
                  hint="Estudiantes bajo 80%"
                />
                <MetricBox
                  tono="bueno"
                  icon={TrendingUp}
                  label="Promedio general"
                  value={
                    t.promedio_general == null
                      ? "—"
                      : t.promedio_general.toFixed(1)
                  }
                  hint="Escala 0–100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Admisiones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4 text-primary" /> Embudo de
                admisiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  tono={t.admisiones_pendientes > 0 ? "atencion" : "bueno"}
                  icon={UserPlus}
                  label="Solicitudes en proceso"
                  value={<CountUp value={t.admisiones_pendientes} />}
                  hint="Por revisar / entrevistar"
                />
                <MetricBox
                  tono={t.admisiones_aceptadas > 0 ? "atencion" : "bueno"}
                  icon={UserPlus}
                  label="Aceptadas sin matricular"
                  value={<CountUp value={t.admisiones_aceptadas} />}
                  hint="Listas para inscribir"
                />
              </div>
              <Link
                href="/admin/admisiones"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-medium"
              >
                Ir a Admisiones <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Alertas ejecutivas */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Alertas
              ejecutivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="rounded-full bg-success/15 p-3 text-success">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-success">
                  Todo en orden
                </p>
                <p className="text-xs text-muted-foreground">
                  No hay indicadores fuera de rango.
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {alertas.map((a, i) => {
                  const st = SEVERIDAD_STYLES[a.severidad];
                  return (
                    <li
                      key={i}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot}`}
                          />
                          <div>
                            <p className="text-sm font-medium leading-tight">
                              {a.titulo}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.detalle}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${st.chip}`}
                        >
                          {a.categoria}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EstadoGeneral({
  altas,
  totalAlertas,
}: {
  altas: number;
  totalAlertas: number;
}) {
  const tono: Tono =
    altas > 0 ? "critico" : totalAlertas > 0 ? "atencion" : "bueno";
  const st = TONO_STYLES[tono];
  const titulo =
    tono === "critico"
      ? "Requiere atención inmediata"
      : tono === "atencion"
        ? "Puntos de seguimiento"
        : "Institución saludable";
  const detalle =
    totalAlertas === 0
      ? "Todos los indicadores dentro de rango."
      : `${totalAlertas} alerta(s) activa(s)${altas > 0 ? `, ${altas} de severidad alta` : ""}.`;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl bg-muted p-3 ${st.text}`}>
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div className="min-w-0">
          <p className={`text-lg font-semibold ${st.text}`}>{titulo}</p>
          <p className="text-sm text-muted-foreground">{detalle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Gauge({
  label,
  pct,
  tono,
  caption,
}: {
  label: string;
  pct: number;
  tono: Tono;
  caption: string;
}) {
  const st = TONO_STYLES[tono];
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-lg font-semibold tabular-nums ${st.text}`}>
          <CountUp value={pct} decimals={1} suffix="%" />
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${st.bar}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  hint,
  tono,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tono: Tono;
}) {
  const st = TONO_STYLES[tono];
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${st.text}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-lg font-semibold tabular-nums ${st.text}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
