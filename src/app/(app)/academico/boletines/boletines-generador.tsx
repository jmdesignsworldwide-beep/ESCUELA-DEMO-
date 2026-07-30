"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { FileText, ShieldCheck, CheckCircle2, XCircle, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SubmitButton } from "@/components/auth/submit-button";
import {
  emitirDocumentoAction,
  emitirMasivaAction,
  verificarFolioAction,
  type EmitirState,
  type VerificarState,
} from "./actions";
import { TIPO_DOC_LABELS, type TipoDocumento } from "@/lib/docs/types";
import { formatFechaRD } from "@/lib/utils";

export function BoletinesGenerador({
  estudiantes,
  secciones,
  periodos,
  recientes,
}: {
  estudiantes: { id: string; nombre: string }[];
  secciones: { id: string; label: string }[];
  periodos: { id: string; nombre: string }[];
  recientes: { folio: string; tipo: string; estudiante: string; fecha: string }[];
}) {
  return (
    <Tabs defaultValue="individual" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="individual">Individual</TabsTrigger>
        <TabsTrigger value="masiva">Masiva por sección</TabsTrigger>
        <TabsTrigger value="verificar">Verificar folio</TabsTrigger>
      </TabsList>

      <TabsContent value="individual">
        <Individual estudiantes={estudiantes} periodos={periodos} />
      </TabsContent>
      <TabsContent value="masiva">
        <Masiva secciones={secciones} periodos={periodos} />
      </TabsContent>
      <TabsContent value="verificar">
        <Verificar />
      </TabsContent>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Documentos recientes</CardTitle>
          <CardDescription>Últimos folios emitidos.</CardDescription>
        </CardHeader>
        <CardContent>
          {recientes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aún no se han emitido documentos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recientes.map((d) => (
                  <TableRow key={d.folio}>
                    <TableCell className="font-mono text-xs">{d.folio}</TableCell>
                    <TableCell>{d.tipo}</TableCell>
                    <TableCell>{d.estudiante}</TableCell>
                    <TableCell>{formatFechaRD(d.fecha)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Tabs>
  );
}

const TIPOS: TipoDocumento[] = [
  "boletin_periodo",
  "boletin_anual",
  "certificacion",
  "constancia_inscripcion",
  "record_notas",
  "buena_conducta",
  "carta_conclusion_primaria",
];

function Individual({
  estudiantes,
  periodos,
}: {
  estudiantes: { id: string; nombre: string }[];
  periodos: { id: string; nombre: string }[];
}) {
  const [state, formAction] = useFormState<EmitirState, FormData>(
    emitirDocumentoAction,
    {},
  );
  const [tipo, setTipo] = React.useState<TipoDocumento>("boletin_periodo");
  const [query, setQuery] = React.useState("");
  const [sel, setSel] = React.useState<{ id: string; nombre: string } | null>(
    null,
  );
  const opened = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (state.ok && state.url && opened.current !== state.folio) {
      opened.current = state.folio ?? null;
      toast.success(`Folio ${state.folio} emitido`);
      window.open(state.url, "_blank");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const filtrados = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return estudiantes
      .filter((e) => e.nombre.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, estudiantes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Emitir documento individual
        </CardTitle>
        <CardDescription>
          Genera un documento membretado con folio único y verificable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Estudiante</Label>
            <input type="hidden" name="estudiante_id" value={sel?.id ?? ""} required />
            {sel ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{sel.nombre}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSel(null);
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
                            setSel(e);
                            setQuery("");
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
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
            <Label>Tipo de documento</Label>
            <Select
              name="tipo"
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoDocumento)}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_DOC_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Período {tipo === "boletin_periodo" ? "" : "(opcional)"}</Label>
            <Select name="periodo_id">
              <SelectTrigger>
                <SelectValue placeholder="N/A" />
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
          <div className="sm:col-span-2">
            <SubmitButton loadingText="Emitiendo…" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Generar documento
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Masiva({
  secciones,
  periodos,
}: {
  secciones: { id: string; label: string }[];
  periodos: { id: string; nombre: string }[];
}) {
  const [state, formAction] = useFormState<EmitirState, FormData>(
    emitirMasivaAction,
    {},
  );
  const opened = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (state.ok && state.url && opened.current !== state.folio) {
      opened.current = state.folio ?? null;
      toast.success(`Lote ${state.folio} generado`);
      window.open(state.url, "_blank");
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Generación masiva por sección
        </CardTitle>
        <CardDescription>
          Genera los boletines de todos los estudiantes de una sección en un
          solo PDF.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Sección</Label>
            <Select name="seccion_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
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
          <div className="space-y-2">
            <Label>Período</Label>
            <Select name="periodo_id" required>
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
          <div className="sm:col-span-2">
            <SubmitButton loadingText="Generando…" className="gap-1.5">
              <Layers className="h-4 w-4" />
              Generar boletines de la sección
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Verificar() {
  const [state, formAction] = useFormState<VerificarState, FormData>(
    verificarFolioAction,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Verificar folio
        </CardTitle>
        <CardDescription>
          Comprueba la autenticidad de un documento por su folio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="folio">Folio</Label>
            <Input id="folio" name="folio" placeholder="CSRA-2026-000123" required />
          </div>
          <SubmitButton loadingText="Verificando…">Verificar</SubmitButton>
        </form>

        {state.checked && (
          <div className="mt-4">
            {state.resultado ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <div>
                  <p className="font-semibold text-success">Documento auténtico</p>
                  <p className="text-sm text-muted-foreground">
                    Folio {state.resultado.folio} ·{" "}
                    {TIPO_DOC_LABELS[state.resultado.tipo as TipoDocumento] ??
                      state.resultado.tipo}{" "}
                    · emitido {formatFechaRD(state.resultado.emitido)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <XCircle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">
                    Folio no encontrado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    No existe un documento con ese folio.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {state.error && (
          <p className="mt-3 text-sm text-destructive">{state.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
