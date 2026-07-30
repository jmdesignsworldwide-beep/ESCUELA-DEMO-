"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  Building2,
  ScrollText,
  ShieldCheck,
  Filter,
  X,
  GraduationCap,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmitButton } from "@/components/auth/submit-button";
import { guardarConfigAction } from "./actions";
import {
  guardarNormasAction,
  toggleRepitenciaAction,
  type NormasState,
} from "./normas-actions";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";
import { formatFechaRD } from "@/lib/utils";
import type {
  ConfigInstitucional,
  EntradaBitacora,
} from "@/lib/settings/types";
import type { NivelNorma, GradoNorma } from "@/lib/academic/normas";

export function AjustesView({
  config,
  bitacora,
  acciones,
  filtroActual,
  niveles,
  grados,
  asistenciaMinima,
}: {
  config: ConfigInstitucional | null;
  bitacora: EntradaBitacora[];
  acciones: { accion: string; total: number }[];
  filtroActual: { accion: string; entidad: string };
  niveles: NivelNorma[];
  grados: GradoNorma[];
  asistenciaMinima: number;
}) {
  return (
    <Tabs defaultValue="ajustes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="ajustes" className="gap-1.5">
          <Building2 className="h-4 w-4" /> Institución
        </TabsTrigger>
        <TabsTrigger value="normas" className="gap-1.5">
          <GraduationCap className="h-4 w-4" /> Normas académicas
        </TabsTrigger>
        <TabsTrigger value="bitacora" className="gap-1.5">
          <ScrollText className="h-4 w-4" /> Bitácora
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ajustes">
        <ConfigForm config={config} />
      </TabsContent>

      <TabsContent value="normas">
        <NormasForm
          niveles={niveles}
          grados={grados}
          asistenciaMinima={asistenciaMinima}
        />
      </TabsContent>

      <TabsContent value="bitacora">
        <BitacoraViewer
          bitacora={bitacora}
          acciones={acciones}
          filtroActual={filtroActual}
        />
      </TabsContent>
    </Tabs>
  );
}

function ConfigForm({ config }: { config: ConfigInstitucional | null }) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    guardarConfigAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Configuración guardada");
    else if (state.error) toast.error(state.error);
  }, [state]);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identidad institucional</CardTitle>
        <CardDescription>
          Datos del colegio para documentos oficiales y comunicaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <Field
            name="nombre"
            label="Nombre del colegio"
            defaultValue={config?.nombre ?? ""}
            required
            error={fe.nombre?.[0]}
            className="sm:col-span-2"
          />
          <Field name="siglas" label="Siglas" defaultValue={config?.siglas ?? ""} />
          <Field name="rnc" label="RNC" defaultValue={config?.rnc ?? ""} />
          <Field name="ciudad" label="Ciudad" defaultValue={config?.ciudad ?? ""} />
          <Field
            name="pais"
            label="País"
            defaultValue={config?.pais ?? "República Dominicana"}
            required
          />
          <Field
            name="direccion"
            label="Dirección"
            defaultValue={config?.direccion ?? ""}
            className="sm:col-span-2"
          />
          <Field name="telefono" label="Teléfono" defaultValue={config?.telefono ?? ""} />
          <Field
            name="email"
            label="Correo"
            defaultValue={config?.email ?? ""}
            error={fe.email?.[0]}
          />
          <Field
            name="director_nombre"
            label="Director(a)"
            defaultValue={config?.director_nombre ?? ""}
          />
          <Field name="lema" label="Lema" defaultValue={config?.lema ?? ""} />
          <div className="sm:col-span-2">
            <SubmitButton loadingText="Guardando…">Guardar cambios</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NormasForm({
  niveles,
  grados,
  asistenciaMinima,
}: {
  niveles: NivelNorma[];
  grados: GradoNorma[];
  asistenciaMinima: number;
}) {
  const [state, formAction] = useFormState<NormasState, FormData>(
    guardarNormasAction,
    {},
  );
  const [mins, setMins] = React.useState<Record<string, string>>(
    Object.fromEntries(
      niveles.map((n) => [n.id, n.min_aprobacion === null ? "" : String(n.min_aprobacion)]),
    ),
  );
  const [asis, setAsis] = React.useState(String(asistenciaMinima));
  React.useEffect(() => {
    if (state.ok) toast.success("Normas académicas guardadas");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const payload = JSON.stringify({
    asistencia_minima: Number(asis),
    niveles: niveles.map((n) => ({
      id: n.id,
      min_aprobacion: mins[n.id] === "" ? "" : Number(mins[n.id]),
    })),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nota mínima de aprobación por nivel</CardTitle>
          <CardDescription>
            Ordenanza 04-2023 MINERD · Primaria 65 · Secundaria 70 · Inicial
            cualitativa (deja vacío). Editable si la normativa cambia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="payload" value={payload} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {niveles.map((n) => (
                <div key={n.id} className="space-y-1.5">
                  <Label className="text-sm">{n.nombre}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={mins[n.id] ?? ""}
                    onChange={(e) =>
                      setMins((m) => ({ ...m, [n.id]: e.target.value }))
                    }
                    placeholder="Cualitativa"
                    className="h-9"
                  />
                </div>
              ))}
            </div>
            <div className="max-w-xs space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Percent className="h-3.5 w-3.5" /> Asistencia mínima (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={asis}
                onChange={(e) => setAsis(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Bajo este umbral, el motor marca condición de asistencia (puede
                reprobar el grado según la ordenanza).
              </p>
            </div>
            <SubmitButton loadingText="Guardando…">Guardar normas</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repitencia por grado</CardTitle>
          <CardDescription>
            1º y 2º de Primaria no contemplan repitencia (prioridad de
            alfabetización inicial). Desmarca los grados que no repiten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {grados.map((g) => (
            <RepitenciaRow key={g.id} grado={g} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RepitenciaRow({ grado }: { grado: GradoNorma }) {
  const [state, formAction] = useFormState<NormasState, FormData>(
    toggleRepitenciaAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Repitencia actualizada");
    else if (state.error) toast.error(state.error);
  }, [state]);

  const permite = grado.permite_repitencia; // valor actual (servidor)
  const target = !permite; // al hacer clic, se invierte

  return (
    <form
      action={formAction}
      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
    >
      <span className="text-sm">
        {grado.nivel_nombre} · {grado.nombre}
      </span>
      <input type="hidden" name="grado_id" value={grado.id} />
      <input type="hidden" name="permite" value={target ? "on" : "off"} />
      <SubmitButton
        size="sm"
        variant={permite ? "outline" : "secondary"}
        loadingText="…"
        className="min-w-[9rem]"
      >
        {permite ? "Repite (normal)" : "No repite"}
      </SubmitButton>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  error,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} required={required} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function BitacoraViewer({
  bitacora,
  acciones,
  filtroActual,
}: {
  bitacora: EntradaBitacora[];
  acciones: { accion: string; total: number }[];
  filtroActual: { accion: string; entidad: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [entidad, setEntidad] = React.useState(filtroActual.entidad);

  const aplicar = (accion: string, ent: string) => {
    const p = new URLSearchParams();
    if (accion) p.set("accion", accion);
    if (ent) p.set("entidad", ent);
    router.replace(p.toString() ? `${pathname}?${p}` : pathname);
  };

  const hayFiltro = filtroActual.accion || filtroActual.entidad;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-success" /> Bitácora inmutable
            </CardTitle>
            <CardDescription>
              Registro de auditoría append-only. {bitacora.length} entradas
              {hayFiltro ? " (filtradas)" : " (últimas 200)"}.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Acción</Label>
              <Select
                value={filtroActual.accion || "__todas"}
                onValueChange={(v) =>
                  aplicar(v === "__todas" ? "" : v, filtroActual.entidad)
                }
              >
                <SelectTrigger className="h-9 w-48">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas">Todas las acciones</SelectItem>
                  {acciones.map((a) => (
                    <SelectItem key={a.accion} value={a.accion}>
                      {a.accion} ({a.total})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entidad</Label>
              <Input
                value={entidad}
                onChange={(e) => setEntidad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") aplicar(filtroActual.accion, entidad);
                }}
                placeholder="Buscar…"
                className="h-9 w-40"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => aplicar(filtroActual.accion, entidad)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            {hayFiltro && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => {
                  setEntidad("");
                  router.replace(pathname);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bitacora.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Sin entradas para el filtro seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                bitacora.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatFechaRD(new Date(b.created_at))}{" "}
                      {new Date(b.created_at).toLocaleTimeString("es-DO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.actor_email ?? "sistema"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {b.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.entidad ?? "—"}
                      {b.entidad_id ? (
                        <span className="ml-1 font-mono text-xs opacity-60">
                          {b.entidad_id.slice(0, 8)}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
