"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Download, FileText, Trophy, Medal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  SITUACION_LABELS,
  SITUACION_VARIANT,
  type CuadroHonorRow,
  type PromedioAsignaturaRow,
  type PromediosResumenRow,
  type SituacionRow,
} from "@/lib/actas/types";
import { cn } from "@/lib/utils";

interface Asig {
  id: string;
  nombre: string;
}

export function ActasView({
  secciones,
  seccionSel,
  seccionNombre,
  umbral,
  minAprob,
  asignaturas,
  roster,
  promedios,
  situacion,
  promAsig,
  cuadro,
  resumen,
}: {
  secciones: { id: string; label: string }[];
  seccionSel: string;
  seccionNombre: string;
  umbral: number;
  minAprob: number | null;
  asignaturas: Asig[];
  roster: { id: string; nombre: string }[];
  promedios: { estudiante_id: string; asignatura_id: string; promedio: number }[];
  situacion: SituacionRow[];
  promAsig: PromedioAsignaturaRow[];
  cuadro: (CuadroHonorRow & { nombre: string })[];
  resumen: PromediosResumenRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const nav = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    sp.set("seccion", params.seccion ?? seccionSel);
    sp.set("umbral", params.umbral ?? String(umbral));
    router.replace(`${pathname}?${sp.toString()}`);
  };

  return (
    <Tabs defaultValue="sabana" className="w-full">
      <TabsList className="mb-3">
        <TabsTrigger value="sabana">Sábana</TabsTrigger>
        <TabsTrigger value="promedios">Promedios</TabsTrigger>
        <TabsTrigger value="cuadro">Cuadro de honor</TabsTrigger>
      </TabsList>

      <TabsContent value="sabana">
        <div className="mb-3 max-w-sm">
          <Label className="text-xs">Sección</Label>
          <Select value={seccionSel} onValueChange={(v) => nav({ seccion: v })}>
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
        <Sabana
          seccionSel={seccionSel}
          seccionNombre={seccionNombre}
          minAprob={minAprob}
          asignaturas={asignaturas}
          roster={roster}
          promedios={promedios}
          situacion={situacion}
          promAsig={promAsig}
        />
      </TabsContent>

      <TabsContent value="promedios">
        <Promedios resumen={resumen} />
      </TabsContent>

      <TabsContent value="cuadro">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="max-w-sm flex-1">
            <Label className="text-xs">Sección</Label>
            <Select value={seccionSel} onValueChange={(v) => nav({ seccion: v })}>
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
          <div className="w-40">
            <Label className="text-xs">Umbral de honor</Label>
            <Select
              value={String(umbral)}
              onValueChange={(v) => nav({ umbral: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[80, 85, 90, 95].map((u) => (
                  <SelectItem key={u} value={String(u)}>
                    ≥ {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CuadroHonor
          seccionSel={seccionSel}
          seccionNombre={seccionNombre}
          umbral={umbral}
          cuadro={cuadro}
        />
      </TabsContent>
    </Tabs>
  );
}

function color(v: number | null, min: number | null): string | undefined {
  if (v === null) return undefined;
  if (min !== null && v < min) return "#D14343";
  return undefined;
}

function Sabana({
  seccionSel,
  seccionNombre,
  minAprob,
  asignaturas,
  roster,
  promedios,
  situacion,
  promAsig,
}: {
  seccionSel: string;
  seccionNombre: string;
  minAprob: number | null;
  asignaturas: Asig[];
  roster: { id: string; nombre: string }[];
  promedios: { estudiante_id: string; asignatura_id: string; promedio: number }[];
  situacion: SituacionRow[];
  promAsig: PromedioAsignaturaRow[];
}) {
  const notaDe = (est: string, asig: string): number | null =>
    promedios.find((p) => p.estudiante_id === est && p.asignatura_id === asig)
      ?.promedio ?? null;
  const sitDe = (est: string): SituacionRow | undefined =>
    situacion.find((s) => s.estudiante_id === est);
  const promAsigDe = (asig: string): number | null =>
    promAsig.find((p) => p.asignatura_id === asig)?.promedio ?? null;

  const exportCSV = () => {
    const head = [
      "Estudiante",
      ...asignaturas.map((a) => a.nombre),
      "Promedio",
      "Asistencia %",
      "Situación",
    ];
    const rows = roster.map((e) => {
      const s = sitDe(e.id);
      return [
        e.nombre,
        ...asignaturas.map((a) => {
          const v = notaDe(e.id, a.id);
          return v === null ? "" : v.toFixed(1);
        }),
        s?.promedio_general?.toFixed(1) ?? "",
        s ? s.asistencia.toFixed(0) : "",
        s ? SITUACION_LABELS[s.situacion] : "",
      ];
    });
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sabana-${seccionNombre.replace(/[^\w]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (roster.length === 0 || asignaturas.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Selecciona una sección con estudiantes y asignaturas.
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Sábana de calificaciones</CardTitle>
          <CardDescription>
            {roster.length} estudiantes · {asignaturas.length} asignaturas ·
            promedio final por asignatura y situación (Ord. 04-2023)
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <a href={`/documentos/sabana/${seccionSel}`} target="_blank" rel="noreferrer">
              <FileText className="h-4 w-4" />
              Imprimir sábana
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[12rem] border border-border bg-muted/60 p-2 text-left text-xs font-semibold">
                  Estudiante
                </th>
                {asignaturas.map((a) => (
                  <th
                    key={a.id}
                    className="border border-border bg-muted/40 p-2 text-center text-xs font-semibold"
                    title={a.nombre}
                  >
                    <span className="block max-w-[5rem] truncate">{a.nombre}</span>
                  </th>
                ))}
                <th className="border border-border bg-primary/10 p-2 text-center text-xs font-semibold">
                  Prom.
                </th>
                <th className="border border-border bg-primary/10 p-2 text-center text-xs font-semibold">
                  Situación
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.map((e) => {
                const s = sitDe(e.id);
                return (
                  <tr key={e.id}>
                    <td className="sticky left-0 z-10 border border-border bg-card p-2 font-medium">
                      {e.nombre}
                    </td>
                    {asignaturas.map((a) => {
                      const v = notaDe(e.id, a.id);
                      return (
                        <td
                          key={a.id}
                          className="border border-border p-2 text-center tabular-nums"
                          style={{ color: color(v, minAprob) }}
                        >
                          {v === null ? "—" : v.toFixed(1)}
                        </td>
                      );
                    })}
                    <td
                      className="border border-border p-2 text-center font-semibold tabular-nums"
                      style={{ color: color(s?.promedio_general ?? null, minAprob) }}
                    >
                      {s?.promedio_general?.toFixed(1) ?? "—"}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {s ? (
                        <Badge variant={SITUACION_VARIANT[s.situacion]}>
                          {SITUACION_LABELS[s.situacion]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="sticky left-0 z-10 border border-border bg-muted/60 p-2 text-xs">
                  Promedio de la asignatura
                </td>
                {asignaturas.map((a) => {
                  const p = promAsigDe(a.id);
                  return (
                    <td
                      key={a.id}
                      className="border border-border p-2 text-center tabular-nums"
                      style={{ color: color(p, minAprob) }}
                    >
                      {p === null ? "—" : p.toFixed(1)}
                    </td>
                  );
                })}
                <td className="border border-border bg-primary/10" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Promedios({ resumen }: { resumen: PromediosResumenRow[] }) {
  // Agrupa por nivel.
  const porNivel = new Map<string, PromediosResumenRow[]>();
  for (const r of resumen) {
    const arr = porNivel.get(r.nivel) ?? [];
    arr.push(r);
    porNivel.set(r.nivel, arr);
  }
  const niveles = [...porNivel.entries()].sort(
    (a, b) => (a[1][0]?.nivel_orden ?? 0) - (b[1][0]?.nivel_orden ?? 0),
  );

  if (resumen.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Aún no hay promedios calculables.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {niveles.map(([nivel, filas]) => {
        const tot = filas.reduce((s, f) => s + f.estudiantes, 0);
        const prom =
          filas.filter((f) => f.promedio_general !== null).length > 0
            ? filas.reduce((s, f) => s + (f.promedio_general ?? 0) * f.estudiantes, 0) /
              Math.max(
                1,
                filas
                  .filter((f) => f.promedio_general !== null)
                  .reduce((s, f) => s + f.estudiantes, 0),
              )
            : null;
        return (
          <Card key={nivel}>
            <CardHeader>
              <CardTitle className="text-lg">{nivel}</CardTitle>
              <CardDescription>
                {tot} estudiantes ·{" "}
                {prom === null ? "sin promedio numérico" : `promedio ${prom.toFixed(1)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="border-b border-border p-2 text-left">Grado / Sección</th>
                      <th className="border-b border-border p-2 text-center">Est.</th>
                      <th className="border-b border-border p-2 text-center">Promedio</th>
                      <th className="border-b border-border p-2 text-center">Promovidos</th>
                      <th className="border-b border-border p-2 text-center">Completivo</th>
                      <th className="border-b border-border p-2 text-center">Reprobados</th>
                      <th className="border-b border-border p-2 text-center">Cond. asist.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas
                      .sort(
                        (a, b) =>
                          a.grado_orden - b.grado_orden ||
                          a.seccion.localeCompare(b.seccion),
                      )
                      .map((f) => (
                        <tr key={f.seccion_id}>
                          <td className="border-b border-border/60 p-2 font-medium">
                            {f.grado} “{f.seccion}”
                          </td>
                          <td className="border-b border-border/60 p-2 text-center tabular-nums">
                            {f.estudiantes}
                          </td>
                          <td className="border-b border-border/60 p-2 text-center font-semibold tabular-nums">
                            {f.promedio_general?.toFixed(1) ?? "—"}
                          </td>
                          <td className="border-b border-border/60 p-2 text-center tabular-nums text-success">
                            {f.promovidos}
                          </td>
                          <td className="border-b border-border/60 p-2 text-center tabular-nums text-gold">
                            {f.completivo}
                          </td>
                          <td className="border-b border-border/60 p-2 text-center tabular-nums text-destructive">
                            {f.reprobados}
                          </td>
                          <td className="border-b border-border/60 p-2 text-center tabular-nums text-destructive">
                            {f.condicion_asistencia}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CuadroHonor({
  seccionSel,
  seccionNombre,
  umbral,
  cuadro,
}: {
  seccionSel: string;
  seccionNombre: string;
  umbral: number;
  cuadro: (CuadroHonorRow & { nombre: string })[];
}) {
  const medalColor = (p: number) =>
    p === 1 ? "#C9A227" : p === 2 ? "#8C9AA6" : p === 3 ? "#B5793B" : undefined;

  return (
    <Card>
      <CardHeader className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-gold" />
            Cuadro de honor
          </CardTitle>
          <CardDescription>
            {seccionNombre} · promedio ≥ {umbral} y asistencia en regla
          </CardDescription>
        </div>
        {cuadro.length > 0 && (
          <Button asChild size="sm" className="gap-1.5">
            <a
              href={`/documentos/cuadro-honor/${seccionSel}?umbral=${umbral}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="h-4 w-4" />
              Imprimir
            </a>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {cuadro.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ningún estudiante alcanza el umbral en esta sección. Prueba con un
            umbral menor.
          </p>
        ) : (
          <ol className="space-y-2">
            {cuadro.map((c) => (
              <li
                key={c.estudiante_id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border p-3",
                  c.puesto <= 3 && "bg-gold-soft/40",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {c.puesto <= 3 ? (
                    <Medal
                      className="h-6 w-6"
                      style={{ color: medalColor(c.puesto) }}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {c.puesto}º
                    </span>
                  )}
                </span>
                <span className="flex-1 font-medium">{c.nombre}</span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums text-primary">
                    {c.promedio_general.toFixed(1)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Asist. {c.asistencia.toFixed(0)}%
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
