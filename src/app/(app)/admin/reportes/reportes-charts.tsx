"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRD } from "@/lib/utils";
import type { Punto, IngresoMes } from "@/lib/reports/queries";

/** Lee los tokens de color del tema activo (RGB triples → rgb()). */
function useThemeColors() {
  const [c, setC] = React.useState({
    primary: "rgb(11 46 79)",
    medium: "rgb(27 79 130)",
    light: "rgb(58 124 184)",
    success: "rgb(46 158 107)",
    warning: "rgb(224 144 43)",
    danger: "rgb(200 60 60)",
    grid: "rgba(120,130,145,0.2)",
    text: "rgb(120 130 145)",
  });

  React.useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (name: string, fallback: string) => {
        const raw = s.getPropertyValue(name).trim();
        return raw ? `rgb(${raw})` : fallback;
      };
      setC({
        primary: v("--primary", "rgb(11 46 79)"),
        medium: v("--primary-medium", "rgb(27 79 130)"),
        light: v("--primary-light", "rgb(58 124 184)"),
        success: v("--success", "rgb(46 158 107)"),
        warning: v("--warning", "rgb(224 144 43)"),
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

const RDTooltip = ({ money }: { money?: boolean }) =>
  function Tip({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-card">
        <p className="mb-1 font-medium text-popover-foreground">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {money ? formatRD(Number(p.value)) : p.value}
          </p>
        ))}
      </div>
    );
  };

export function ReportesCharts({
  matricula,
  ingresos,
  aging,
  rendimiento,
  familiasMorosas,
}: {
  matricula: Punto[];
  ingresos: IngresoMes[];
  aging: Punto[];
  rendimiento: Punto[];
  familiasMorosas: number;
}) {
  const c = useThemeColors();
  const pieColors = [c.primary, c.medium, c.light, c.success, c.warning];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Ingresos por mes */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingresos por mes</CardTitle>
          <CardDescription>Esperado vs. cobrado (RD$)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ingresos} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" stroke={c.text} fontSize={12} tickLine={false} />
                <YAxis
                  stroke={c.text}
                  fontSize={11}
                  tickLine={false}
                  width={70}
                  tickFormatter={(v) => formatRD(Number(v))}
                />
                <Tooltip content={RDTooltip({ money: true })} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="esperado"
                  name="Esperado"
                  stroke={c.light}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cobrado"
                  name="Cobrado"
                  stroke={c.success}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Matrícula por nivel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Matrícula por nivel</CardTitle>
          <CardDescription>Estudiantes activos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={matricula}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {matricula.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={RDTooltip({})} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Rendimiento por nivel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rendimiento por nivel</CardTitle>
          <CardDescription>Promedio general (0–100)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rendimiento} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" stroke={c.text} fontSize={12} tickLine={false} />
                <YAxis stroke={c.text} fontSize={11} tickLine={false} domain={[0, 100]} width={32} />
                <Tooltip content={RDTooltip({})} />
                <Bar dataKey="value" name="Promedio" fill={c.medium} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Morosidad aging */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Antigüedad de la morosidad</CardTitle>
          <CardDescription>
            {familiasMorosas} familias con saldo vencido · monto por tramo de días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" stroke={c.text} fontSize={12} tickLine={false} />
                <YAxis
                  stroke={c.text}
                  fontSize={11}
                  tickLine={false}
                  width={70}
                  tickFormatter={(v) => formatRD(Number(v))}
                />
                <Tooltip content={RDTooltip({ money: true })} />
                <Bar dataKey="value" name="Monto" radius={[4, 4, 0, 0]}>
                  {aging.map((_, i) => (
                    <Cell
                      key={i}
                      fill={[c.light, c.medium, c.warning, c.danger][i] ?? c.primary}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
