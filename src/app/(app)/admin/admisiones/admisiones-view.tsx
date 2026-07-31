"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  Inbox,
  UserCheck,
  CalendarClock,
  GraduationCap,
  Phone,
  Mail,
  History,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFechaRD } from "@/lib/utils";
import {
  cambiarEstadoSolicitudAction,
  matricularAspiranteAction,
  eventosSolicitudAction,
  type ActionState,
} from "./actions";
import {
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_STYLES,
  ESTADOS_TRANSICION,
  type AdmisionEvento,
  type AdmisionesResumen,
  type EstadoSolicitud,
  type SolicitudAdmision,
} from "@/lib/admisiones/types";

const KPIS: {
  key: keyof AdmisionesResumen;
  label: string;
  icon: typeof Inbox;
}[] = [
  { key: "recibida", label: "Recibidas", icon: Inbox },
  { key: "en_revision", label: "En revisión", icon: History },
  { key: "entrevista", label: "Entrevista", icon: CalendarClock },
  { key: "aceptada", label: "Aceptadas", icon: UserCheck },
  { key: "matriculada", label: "Matriculadas", icon: GraduationCap },
];

const FILTROS: { value: string; label: string }[] = [
  { value: "todas", label: "Todas" },
  ...ESTADOS_TRANSICION.map((e) => ({
    value: e,
    label: ESTADO_SOLICITUD_LABELS[e],
  })),
  { value: "matriculada", label: "Matriculadas" },
];

export function AdmisionesView({
  resumen,
  solicitudes,
  estadoFiltro,
  seccionOpciones,
  puedeMatricular,
}: {
  resumen: AdmisionesResumen;
  solicitudes: SolicitudAdmision[];
  estadoFiltro: string;
  seccionOpciones: { id: string; label: string }[];
  puedeMatricular: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sel, setSel] = React.useState<SolicitudAdmision | null>(null);

  const filtrar = (estado: string) => {
    const p = new URLSearchParams();
    if (estado !== "todas") p.set("estado", estado);
    router.replace(p.toString() ? `${pathname}?${p.toString()}` : pathname);
  };

  return (
    <div className="space-y-4">
      {/* KPIs del embudo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.key}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {resumen[k.key]}
                  </p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => filtrar(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              estadoFiltro === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de solicitudes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {solicitudes.length} solicitud(es)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {solicitudes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay solicitudes en este filtro.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {solicitudes.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSel(s)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.aspirante}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{s.codigo}</span> · {s.grado}{" "}
                        · {s.tutor}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_SOLICITUD_STYLES[s.estado]}`}
                    >
                      {ESTADO_SOLICITUD_LABELS[s.estado]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DetalleDialog
        solicitud={sel}
        onClose={() => setSel(null)}
        seccionOpciones={seccionOpciones}
        puedeMatricular={puedeMatricular}
      />
    </div>
  );
}

function DetalleDialog({
  solicitud,
  onClose,
  seccionOpciones,
  puedeMatricular,
}: {
  solicitud: SolicitudAdmision | null;
  onClose: () => void;
  seccionOpciones: { id: string; label: string }[];
  puedeMatricular: boolean;
}) {
  const [eventos, setEventos] = React.useState<AdmisionEvento[]>([]);
  const [cargandoEv, setCargandoEv] = React.useState(false);

  React.useEffect(() => {
    if (!solicitud) return;
    setEventos([]);
    setCargandoEv(true);
    eventosSolicitudAction(solicitud.id)
      .then(setEventos)
      .finally(() => setCargandoEv(false));
  }, [solicitud]);

  if (!solicitud) return null;
  const s = solicitud;
  const esMatriculada = s.estado === "matriculada";

  return (
    <Dialog open={!!solicitud} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{s.aspirante}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{s.codigo}</span> · {s.grado} ·{" "}
            {s.anio_escolar}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <Dato label="Sexo" value={s.sexo === "F" ? "Femenino" : "Masculino"} />
            <Dato label="Nacimiento" value={formatFechaRD(s.fecha_nacimiento)} />
            <Dato label="Nacionalidad" value={s.nacionalidad} />
            <Dato label="Procedencia" value={s.colegio_procedencia ?? "—"} />
            <Dato label="Tutor" value={`${s.tutor} (${s.parentesco})`} />
            <Dato
              label="Contacto"
              value={
                <span className="flex flex-col">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {s.telefono}
                  </span>
                  {s.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {s.email}
                    </span>
                  )}
                </span>
              }
            />
            {s.mensaje && (
              <div className="col-span-2">
                <Dato label="Mensaje" value={s.mensaje} />
              </div>
            )}
            {s.notas_internas && (
              <div className="col-span-2">
                <Dato label="Notas internas" value={s.notas_internas} />
              </div>
            )}
          </div>

          {/* Bitácora */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Historial
            </p>
            {cargandoEv ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
              </p>
            ) : eventos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos.</p>
            ) : (
              <ol className="space-y-1.5">
                {eventos.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="font-medium text-foreground">
                        {ESTADO_SOLICITUD_LABELS[ev.estado_nuevo]}
                      </span>{" "}
                      · {formatFechaRD(ev.created_at)}
                      {ev.nota ? ` — ${ev.nota}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {esMatriculada ? (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              Este aspirante ya fue matriculado como estudiante.
            </p>
          ) : (
            <>
              <CambiarEstadoForm solicitud={s} onDone={onClose} />
              {puedeMatricular && s.estado === "aceptada" && (
                <MatricularForm
                  solicitud={s}
                  seccionOpciones={seccionOpciones}
                  onDone={onClose}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CambiarEstadoForm({
  solicitud,
  onDone,
}: {
  solicitud: SolicitudAdmision;
  onDone: () => void;
}) {
  const [estado, setEstado] = React.useState<EstadoSolicitud>(solicitud.estado);
  const [state, formAction] = useFormState<ActionState, FormData>(
    cambiarEstadoSolicitudAction,
    {},
  );
  const handled = React.useRef(false);
  React.useEffect(() => {
    if (handled.current) return;
    if (state.ok) {
      handled.current = true;
      toast.success("Solicitud actualizada.");
      onDone();
    } else if (state.error) {
      handled.current = true;
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">Actualizar estado</p>
      <input type="hidden" name="solicitud_id" value={solicitud.id} />
      <input type="hidden" name="estado" value={estado} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Nuevo estado</Label>
          <Select
            value={estado}
            onValueChange={(v) => setEstado(v as EstadoSolicitud)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_TRANSICION.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_SOLICITUD_LABELS[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {estado === "entrevista" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de entrevista</Label>
            <Input type="datetime-local" name="entrevista" />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Nota (opcional)</Label>
        <Textarea
          name="nota"
          rows={2}
          placeholder="Comentario interno para la bitácora…"
        />
      </div>
      <SubmitButton>Guardar cambio</SubmitButton>
    </form>
  );
}

function MatricularForm({
  solicitud,
  seccionOpciones,
  onDone,
}: {
  solicitud: SolicitudAdmision;
  seccionOpciones: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [seccion, setSeccion] = React.useState("");
  const [state, formAction] = useFormState<ActionState, FormData>(
    matricularAspiranteAction,
    {},
  );
  const handled = React.useRef(false);
  React.useEffect(() => {
    if (handled.current) return;
    if (state.ok) {
      handled.current = true;
      toast.success("¡Aspirante matriculado! Ya es estudiante activo.");
      onDone();
    } else if (state.error) {
      handled.current = true;
      toast.error(state.error);
    }
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-3"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
        <GraduationCap className="h-4 w-4" /> Matricular como estudiante
      </p>
      <p className="text-xs text-muted-foreground">
        Crea el expediente del estudiante, su tutor y la matrícula del año
        activo en la sección seleccionada.
      </p>
      <input type="hidden" name="solicitud_id" value={solicitud.id} />
      <input type="hidden" name="seccion_id" value={seccion} />
      <div className="space-y-1.5">
        <Label className="text-xs">Sección de destino</Label>
        <Select value={seccion} onValueChange={setSeccion}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una sección…" />
          </SelectTrigger>
          <SelectContent>
            {seccionOpciones.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SubmitButton variant="success" disabled={!seccion}>
        Confirmar matrícula
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  variant,
  disabled,
}: {
  children: React.ReactNode;
  variant?: "success";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={pending || disabled}
      className="gap-1.5"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

function Dato({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}
