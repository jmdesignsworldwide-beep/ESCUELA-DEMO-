"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Users, TrendingUp, AlertTriangle, CalendarCheck, Download, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MESES_ABREV,
  type AsistenciaDashboard,
  type AsistenciaNivel,
  type AsistenciaSeccionResumen,
  type TendenciaMes,
} from "@/lib/attendance/analytics-types";

function useThemeColors() {
  const [c, setC] = React.useState({
    primary: "rgb(11 46 79)",
    success: "rgb(46 158 107)",
    danger: "rgb(200 60 60)",
    grid: "rgba(120,130,145,0.2)",
    text: "rgb(120 130 145)",
  });
  React.useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (name: string, fb: string) => {
        const raw = s.getPropertyValue(name).trim();
        return raw ? `rgb(${raw})` : fb;
      };
      setC({
        primary: v("--primary-light", "rgb(58 124 184)"),
        success: v("--success", "rgb(46 158 107)"),
        danger: v("--destructive", "rgb(200 60 60)"),
        grid: "rgba(120,130,145,0.2)",
        text: v("--muted-foreground", "rgb(120 130 145)"),
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  return c;
}

function PctTip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

export function AsistenciaReportesView({
  minimo,
  dashboard,
  tendencia,
  porNivel,
  secciones,
  seccionSel,
  seccionNombre,
  resumen,
}: {
  minimo: number;
  dashboard: AsistenciaDashboard;
  tendencia: TendenciaMes[];
  porNivel: AsistenciaNivel[];
  secciones: { id: string; label: string }[];
  seccionSel: string;
  seccionNombre: string;
  resumen: (AsistenciaSeccionResumen & { nombre: string })[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();

  const tendData = tendencia.map((t) => ({
    label: `${MESES_ABREV[t.mes - 1]} ${String(t.anio_cal).slice(2)}`,
    pct: t.pct,
  }));
  const nivelData = porNivel.map((n) => ({ label: n.nivel, pct: n.pct }));

  const exportCSV = () => {
    const head = ["Estudiante", "Días", "Presentes", "Ausencias", "Tardanzas", "%", "Semáforo"];
    const rows = resumen.map((r) => [
      r.nombre,
      r.dias,
      r.presentes,
      r.ausencias,
      r.tardanzas,
      r.pct.toFixed(1),
      r.en_riesgo ? "Rojo" : "Verde",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia-${seccionNombre.replace(/[^\w]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Asistencia global"
          value={`${dashboard.pct_global.toFixed(1)}%`}
          tone={dashboard.pct_global >= minimo ? "success" : "danger"}
        />
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Estudiantes"
          value={String(dashboard.estudiantes_total)}
        />
        <Kpi
          icon={<AlertTriangle className="h-5 w-5" />}
          label={`En riesgo (< ${minimo}%)`}
          value={String(dashboard.estudiantes_riesgo)}
          tone={dashboard.estudiantes_riesgo > 0 ? "danger" : "success"}
        />
        <Kpi
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Registros"
          value={dashboard.registros.toLocaleString("es-DO")}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia mensual</CardTitle>
            <CardDescription>% de asistencia por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: colors.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fill: colors.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PctTip />} />
                  <ReferenceLine y={minimo} stroke={colors.danger} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="pct" name="Asistencia" stroke={colors.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asistencia por nivel</CardTitle>
            <CardDescription>Verde ≥ {minimo}% · rojo por debajo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nivelData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: colors.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: colors.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<PctTip />} cursor={{ fill: colors.grid }} />
                  <ReferenceLine y={minimo} stroke={colors.danger} strokeDasharray="4 4" />
                  <Bar dataKey="pct" name="Asistencia" radius={[4, 4, 0, 0]}>
                    {nivelData.map((d, i) => (
                      <Cell key={i} fill={d.pct >= minimo ? colors.success : colors.danger} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Semáforo por sección */}
      <Card>
        <CardHeader className="flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <CardTitle className="mb-2 text-base">Semáforo por estudiante</CardTitle>
            <Label className="text-xs">Sección</Label>
            <Select
              value={seccionSel}
              onValueChange={(v) => router.replace(`${pathname}?seccion=${v}`)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sección" />
              </SelectTrigger>
              <SelectContent>
                {secciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <a href={`/documentos/asistencia/${seccionSel}`} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4" />
                Imprimir
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="border-b border-border p-2 text-left">Estudiante</th>
                  <th className="border-b border-border p-2 text-center">Días</th>
                  <th className="border-b border-border p-2 text-center">Presentes</th>
                  <th className="border-b border-border p-2 text-center">Ausencias</th>
                  <th className="border-b border-border p-2 text-center">Tardanzas</th>
                  <th className="border-b border-border p-2 text-center">%</th>
                  <th className="border-b border-border p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resumen.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Selecciona una sección con asistencia registrada.
                    </td>
                  </tr>
                )}
                {[...resumen]
                  .sort((a, b) => a.pct - b.pct)
                  .map((r) => (
                    <tr key={r.estudiante_id}>
                      <td className="border-b border-border/60 p-2 font-medium">{r.nombre}</td>
                      <td className="border-b border-border/60 p-2 text-center tabular-nums">{r.dias}</td>
                      <td className="border-b border-border/60 p-2 text-center tabular-nums text-success">{r.presentes}</td>
                      <td className="border-b border-border/60 p-2 text-center tabular-nums text-destructive">{r.ausencias}</td>
                      <td className="border-b border-border/60 p-2 text-center tabular-nums text-gold">{r.tardanzas}</td>
                      <td
                        className={`border-b border-border/60 p-2 text-center font-semibold tabular-nums ${r.en_riesgo ? "text-destructive" : "text-success"}`}
                      >
                        {r.pct.toFixed(1)}%
                      </td>
                      <td className="border-b border-border/60 p-2 text-center">
                        <Badge variant={r.en_riesgo ? "destructive" : "success"}>
                          {r.en_riesgo ? "Rojo" : "Verde"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : "text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className={`shrink-0 ${toneClass}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={`font-serif text-xl font-semibold ${toneClass}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
