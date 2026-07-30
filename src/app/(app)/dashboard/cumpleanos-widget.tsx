"use client";

import { Cake, GraduationCap, UserCog } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Cumpleanos } from "@/lib/dashboard/cumpleanos";

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function CumpleanosWidget({ items }: { items: Cumpleanos[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cake className="h-5 w-5 text-gold" />
          Próximos cumpleaños
        </CardTitle>
        <CardDescription>Estudiantes y personal · próximos 15 días.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c, i) => (
            <li
              key={`${c.nombre}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-border p-2.5"
            >
              <span
                className={
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full " +
                  (c.dias_para === 0
                    ? "bg-gold text-primary"
                    : "bg-muted text-muted-foreground")
                }
              >
                {c.tipo === "empleado" ? (
                  <UserCog className="h-4 w-4" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {c.dia} {MESES[c.mes - 1]} · cumple {c.edad}
                </p>
              </div>
              <Badge variant={c.dias_para === 0 ? "gold" : "secondary"} className="shrink-0">
                {c.dias_para === 0 ? "¡Hoy!" : `${c.dias_para}d`}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
