"use client";

import { GraduationCap, Sparkles, Hash } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CICLO_LABELS,
  type Grado,
  type Nivel,
} from "@/lib/academic/types";
import { cn } from "@/lib/utils";

export function NivelesPanel({
  niveles,
  grados,
}: {
  niveles: Nivel[];
  grados: Grado[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {niveles.map((nivel) => {
        const gs = grados
          .filter((g) => g.nivel_id === nivel.id)
          .sort((a, b) => a.orden - b.orden);
        const cualitativa = nivel.tipo_evaluacion === "cualitativa";
        return (
          <Card key={nivel.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {cualitativa ? (
                    <Sparkles className="h-5 w-5 text-gold" />
                  ) : (
                    <GraduationCap className="h-5 w-5 text-primary" />
                  )}
                  <CardTitle className="text-lg">{nivel.nombre}</CardTitle>
                </div>
                <Badge variant={cualitativa ? "gold" : "secondary"}>
                  {cualitativa ? "Cualitativa" : "Numérica"}
                </Badge>
              </div>
              <CardDescription>
                {cualitativa
                  ? "Evaluación por indicadores de logro, sin nota numérica."
                  : "Calificación MINERD 0–100 · aprobación por nivel (Ajustes)."}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="flex flex-wrap gap-2">
                {gs.map((g) => (
                  <span
                    key={g.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-sm font-medium",
                    )}
                    title={g.ciclo ? CICLO_LABELS[g.ciclo] : undefined}
                  >
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    {g.nombre}
                  </span>
                ))}
              </div>
              {gs.some((g) => g.ciclo) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  1ro–3ro: Primer Ciclo · 4to–6to: Segundo Ciclo (modalidades
                  Académica, Técnico-Profesional, Artes).
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
