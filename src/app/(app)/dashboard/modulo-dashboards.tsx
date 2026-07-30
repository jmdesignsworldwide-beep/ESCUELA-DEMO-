"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  Wallet,
  UserCog,
  Boxes,
  Users,
  Star,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Library,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import type { TableroKpis } from "@/lib/dashboard/tablero";
import type { DashKpis } from "@/lib/reports/queries";

interface Tile {
  label: string;
  value: number;
  icon: LucideIcon;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  tone?: "default" | "success" | "gold" | "danger";
}
interface Modulo {
  titulo: string;
  icon: LucideIcon;
  tiles: Tile[];
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
} as const;

export function ModuloDashboards({
  tablero,
  financiero,
}: {
  tablero: TableroKpis | null;
  financiero: DashKpis | null;
}) {
  const modulos: Modulo[] = [];

  if (tablero) {
    modulos.push({
      titulo: "Académico",
      icon: GraduationCap,
      tiles: [
        { label: "Estudiantes activos", value: tablero.estudiantes_activos, icon: Users },
        { label: "Promedio general", value: tablero.promedio_general, icon: Star, decimals: 1, tone: "gold" },
        { label: "Asistencia", value: tablero.pct_asistencia, icon: CalendarCheck, decimals: 1, suffix: "%", tone: "success" },
        { label: "En riesgo de asistencia", value: tablero.riesgo_asistencia, icon: AlertTriangle, tone: tablero.riesgo_asistencia > 0 ? "danger" : "success" },
      ],
    });
  }

  if (financiero) {
    modulos.push({
      titulo: "Financiero",
      icon: Wallet,
      tiles: [
        { label: "Cobrado", value: financiero.cobrado, icon: TrendingUp, prefix: "RD$ ", tone: "success" },
        { label: "Pendiente", value: financiero.pendiente, icon: TrendingDown, prefix: "RD$ ", tone: "danger" },
        { label: "Familias morosas", value: financiero.familias_morosas, icon: AlertTriangle, tone: financiero.familias_morosas > 0 ? "danger" : "success" },
      ],
    });
  }

  if (tablero) {
    modulos.push({
      titulo: "Personal",
      icon: UserCog,
      tiles: [
        { label: "Docentes activos", value: tablero.docentes_activos, icon: GraduationCap },
        { label: "Empleados activos", value: tablero.empleados_activos, icon: Users },
      ],
    });
    modulos.push({
      titulo: "Operaciones",
      icon: Boxes,
      tiles: [
        { label: "Préstamos activos", value: tablero.prestamos_activos, icon: Library, tone: "gold" },
        { label: "Circulares del mes", value: tablero.circulares_mes, icon: Megaphone },
      ],
    });
  }

  if (modulos.length === 0) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mb-6 grid gap-4 lg:grid-cols-2"
    >
      {modulos.map((m) => (
        <motion.div key={m.titulo} variants={item}>
          <Card className="h-full p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <m.icon className="h-4 w-4" />
              </span>
              <h3 className="font-serif text-lg font-semibold">{m.titulo}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {m.tiles.map((t) => (
                <KpiTile key={t.label} tile={t} />
              ))}
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

function KpiTile({ tile }: { tile: Tile }) {
  const toneClass =
    tile.tone === "success"
      ? "text-success"
      : tile.tone === "danger"
        ? "text-destructive"
        : tile.tone === "gold"
          ? "text-gold"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <tile.icon className="h-3.5 w-3.5" />
        <span className="truncate text-[0.7rem] font-medium uppercase tracking-wide">
          {tile.label}
        </span>
      </div>
      <p className={`font-serif text-2xl font-semibold tabular-nums ${toneClass}`}>
        <CountUp
          value={tile.value}
          decimals={tile.decimals ?? 0}
          prefix={tile.prefix ?? ""}
          suffix={tile.suffix ?? ""}
        />
      </p>
    </div>
  );
}
