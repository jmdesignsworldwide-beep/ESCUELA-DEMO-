"use client";

import * as React from "react";
import { FileText, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function BoletinCompetenciasView({
  estudiantes,
  periodos,
}: {
  estudiantes: { id: string; nombre: string }[];
  periodos: { id: string; nombre: string }[];
}) {
  const [query, setQuery] = React.useState("");
  const [estSel, setEstSel] = React.useState<{ id: string; nombre: string } | null>(
    null,
  );
  const [periodoSel, setPeriodoSel] = React.useState(periodos[0]?.id ?? "");

  const filtrados = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return estudiantes
      .filter((e) => e.nombre.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, estudiantes]);

  const abrir = () => {
    if (!estSel || !periodoSel) return;
    const url = `/documentos/boletin-competencias/${estSel.id}?periodo=${periodoSel}`;
    window.open(url, "_blank");
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Generar boletín por competencias
        </CardTitle>
        <CardDescription>
          Busca al estudiante, elige el período y abre el informe membretado
          (imprimible → PDF).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Estudiante</Label>
          {estSel ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">{estSel.nombre}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEstSel(null);
                  setQuery("");
                }}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe apellido o nombre…"
                className="pl-9"
              />
              {filtrados.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-card">
                  {filtrados.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setEstSel(e);
                          setQuery("");
                        }}
                        className={cn(
                          "block w-full px-3 py-2 text-left text-sm hover:bg-accent",
                        )}
                      >
                        {e.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.trim() && filtrados.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sin coincidencias.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={periodoSel} onValueChange={setPeriodoSel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona…" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={abrir}
          disabled={!estSel || !periodoSel}
          className="gap-1.5"
        >
          <FileText className="h-4 w-4" />
          Ver boletín
        </Button>
      </CardContent>
    </Card>
  );
}
