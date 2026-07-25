"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import {
  Megaphone,
  Send,
  Eye,
  AlertTriangle,
  Bell,
  FileText,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { CrearDialog } from "@/components/academico/crear-dialog";
import type { ActionState } from "@/app/(app)/academico/estructura/actions";
import {
  crearCircularAction,
  publicarCircularAction,
  type SimpleState,
} from "./actions";
import { formatFechaRD } from "@/lib/utils";
import {
  TIPO_CIRCULAR_LABELS,
  AUDIENCIA_LABELS,
  type Circular,
  type TipoCircular,
} from "@/lib/comms/types";

type Opt = { id: string; label: string };

export function ComunicacionView({
  canWrite,
  circulares,
  niveles,
  secciones,
}: {
  canWrite: boolean;
  circulares: Circular[];
  niveles: Opt[];
  secciones: Opt[];
}) {
  const publicadas = circulares.filter((c) => c.publicada);
  const borradores = circulares.filter((c) => !c.publicada);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Stat label="Publicadas" value={publicadas.length} />
          <Stat label="Borradores" value={borradores.length} />
        </div>
        {canWrite && (
          <CrearDialog
            triggerLabel="Nueva circular"
            title="Nueva circular"
            description="Redacta el comunicado y elige la audiencia."
            action={crearCircularAction}
            submitLabel="Guardar borrador"
          >
            {(state) => (
              <CircularFormFields
                state={state}
                niveles={niveles}
                secciones={secciones}
              />
            )}
          </CrearDialog>
        )}
      </div>

      {circulares.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Megaphone className="h-8 w-8 opacity-40" />
            <p className="text-sm">Aún no hay circulares. Crea la primera.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {circulares.map((c) => (
            <CircularCard key={c.id} circular={c} canWrite={canWrite} />
          ))}
        </div>
      )}
    </div>
  );
}

function CircularCard({
  circular,
  canWrite,
}: {
  circular: Circular;
  canWrite: boolean;
}) {
  return (
    <Card className={circular.tipo === "urgente" ? "border-destructive/40" : ""}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <TipoIcon tipo={circular.tipo} />
              {circular.titulo}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{TIPO_CIRCULAR_LABELS[circular.tipo]}</Badge>
              <Badge variant="secondary">
                {AUDIENCIA_LABELS[circular.audiencia]}
              </Badge>
              {circular.publicada ? (
                <span className="text-xs text-muted-foreground">
                  Folio {circular.folio} ·{" "}
                  {circular.publicada_at
                    ? formatFechaRD(new Date(circular.publicada_at))
                    : ""}
                </span>
              ) : (
                <Badge className="gap-1" variant="outline">
                  <FileText className="h-3 w-3" /> Borrador
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            {circular.publicada ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={`/documentos/circular/${circular.id}`} target="_blank">
                  <Eye className="h-3.5 w-3.5" />
                  Ver · WhatsApp
                </Link>
              </Button>
            ) : (
              canWrite && <PublicarForm circularId={circular.id} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
          {circular.cuerpo}
        </p>
      </CardContent>
    </Card>
  );
}

function PublicarForm({ circularId }: { circularId: string }) {
  const [state, formAction] = useFormState<SimpleState, FormData>(
    publicarCircularAction,
    {},
  );
  React.useEffect(() => {
    if (state.ok) toast.success("Circular publicada");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={formAction}>
      <input type="hidden" name="circular_id" value={circularId} />
      <SubmitButton size="sm" loadingText="Publicando…" className="gap-1.5">
        <Send className="h-3.5 w-3.5" />
        Publicar
      </SubmitButton>
    </form>
  );
}

function CircularFormFields({
  state,
  niveles,
  secciones,
}: {
  state: ActionState;
  niveles: Opt[];
  secciones: Opt[];
}) {
  const [audiencia, setAudiencia] = React.useState("todos");
  const [tipo, setTipo] = React.useState("circular");
  const [nivel, setNivel] = React.useState("");
  const [seccion, setSeccion] = React.useState("");
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" maxLength={140} required />
        {fe.titulo && <p className="text-xs text-destructive">{fe.titulo[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cuerpo">Mensaje</Label>
        <Textarea id="cuerpo" name="cuerpo" rows={5} required />
        {fe.cuerpo && <p className="text-xs text-destructive">{fe.cuerpo[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <input type="hidden" name="tipo" value={tipo} />
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TIPO_CIRCULAR_LABELS) as TipoCircular[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_CIRCULAR_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Audiencia</Label>
          <input type="hidden" name="audiencia" value={audiencia} />
          <Select value={audiencia} onValueChange={setAudiencia}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda la comunidad</SelectItem>
              <SelectItem value="tutores">Padres y tutores</SelectItem>
              <SelectItem value="nivel">Un nivel</SelectItem>
              <SelectItem value="seccion">Una sección</SelectItem>
              <SelectItem value="morosos">Familias con saldo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {audiencia === "nivel" && (
        <div className="space-y-1.5">
          <Label>Nivel</Label>
          <input type="hidden" name="nivel_id" value={nivel} />
          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un nivel" />
            </SelectTrigger>
            <SelectContent>
              {niveles.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.nivel_id && (
            <p className="text-xs text-destructive">{fe.nivel_id[0]}</p>
          )}
        </div>
      )}

      {audiencia === "seccion" && (
        <div className="space-y-1.5">
          <Label>Sección</Label>
          <input type="hidden" name="seccion_id" value={seccion} />
          <Select value={seccion} onValueChange={setSeccion}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una sección" />
            </SelectTrigger>
            <SelectContent>
              {secciones.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.seccion_id && (
            <p className="text-xs text-destructive">{fe.seccion_id[0]}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TipoIcon({ tipo }: { tipo: TipoCircular }) {
  if (tipo === "urgente")
    return <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />;
  if (tipo === "aviso")
    return <Bell className="h-4 w-4 shrink-0 text-warning" />;
  return <Megaphone className="h-4 w-4 shrink-0 text-primary" />;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border px-4 py-2">
      <p className="font-serif text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
