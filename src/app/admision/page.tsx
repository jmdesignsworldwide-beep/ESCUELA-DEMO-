"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  CheckCircle2,
  Search,
  Loader2,
  Send,
  Copy,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo";
import { COLEGIO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFechaRD } from "@/lib/utils";
import {
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_STYLES,
  type ConsultaAdmision,
  type EstadoSolicitud,
  type GradoOpcion,
} from "@/lib/admisiones/types";

const PARENTESCOS = [
  { value: "madre", label: "Madre" },
  { value: "padre", label: "Padre" },
  { value: "tutor_legal", label: "Tutor(a) legal" },
  { value: "abuelo", label: "Abuelo" },
  { value: "abuela", label: "Abuela" },
  { value: "otro", label: "Otro" },
];

export default function AdmisionPage() {
  const [tab, setTab] = React.useState<"solicitud" | "consulta">("solicitud");

  return (
    <main className="min-h-dvh bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-16 w-16" />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-foreground">
            Admisiones {COLEGIO.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Completa la solicitud de ingreso en línea. Recibirás un código para
            dar seguimiento a tu proceso.
          </p>
        </div>

        <div className="mb-4 flex justify-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("solicitud")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "solicitud"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nueva solicitud
          </button>
          <button
            type="button"
            onClick={() => setTab("consulta")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "consulta"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Consultar estado
          </button>
        </div>

        {tab === "solicitud" ? <SolicitudForm /> : <ConsultaForm />}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-primary">
            Acceso institucional
          </Link>
        </p>
      </div>
    </main>
  );
}

function SolicitudForm() {
  const [grados, setGrados] = React.useState<GradoOpcion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [codigo, setCodigo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState(false);

  const [form, setForm] = React.useState({
    grado_id: "",
    anio_escolar: "2026-2027",
    asp_nombres: "",
    asp_apellidos: "",
    asp_sexo: "M",
    asp_nacimiento: "",
    asp_nacionalidad: "Dominicana",
    colegio_proc: "",
    tutor_nombres: "",
    tutor_apellidos: "",
    tutor_parentesco: "madre",
    tutor_telefono: "",
    tutor_email: "",
    tutor_cedula: "",
    mensaje: "",
  });
  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("admision_grados")
      .then(({ data }) =>
        setGrados(
          ((data as { id: string; etiqueta: string }[] | null) ?? []).map(
            (r) => ({ id: r.id, etiqueta: r.etiqueta }),
          ),
        ),
      );
  }, []);

  const valido =
    form.grado_id &&
    form.asp_nombres.trim().length >= 2 &&
    form.asp_apellidos.trim().length >= 2 &&
    form.asp_nacimiento &&
    form.tutor_nombres.trim().length >= 2 &&
    form.tutor_apellidos.trim().length >= 2 &&
    form.tutor_telefono.replace(/\D/g, "").length >= 10;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) {
      setError("Revisa los campos obligatorios (*).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc(
        "crear_solicitud_admision",
        {
          p_grado: form.grado_id,
          p_anio_escolar: form.anio_escolar,
          p_asp_nombres: form.asp_nombres,
          p_asp_apellidos: form.asp_apellidos,
          p_asp_sexo: form.asp_sexo,
          p_asp_nacimiento: form.asp_nacimiento,
          p_asp_nacionalidad: form.asp_nacionalidad,
          p_colegio_proc: form.colegio_proc,
          p_tutor_nombres: form.tutor_nombres,
          p_tutor_apellidos: form.tutor_apellidos,
          p_tutor_parentesco: form.tutor_parentesco,
          p_tutor_telefono: form.tutor_telefono,
          p_tutor_email: form.tutor_email,
          p_tutor_cedula: form.tutor_cedula,
          p_mensaje: form.mensaje,
        },
      );
      if (err || !data) {
        setError("No se pudo registrar la solicitud. Verifica los datos.");
      } else {
        setCodigo(data as string);
      }
    } catch {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (codigo) {
    return (
      <div className="rounded-2xl border border-success/30 bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h2 className="mt-4 font-serif text-xl font-semibold">
          ¡Solicitud recibida!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guarda este código para consultar el estado de tu proceso de admisión.
        </p>
        <div className="mx-auto mt-5 flex max-w-xs items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <span className="font-mono text-lg font-semibold tracking-wide">
            {codigo}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              navigator.clipboard?.writeText(codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            }}
            aria-label="Copiar código"
          >
            {copiado ? (
              <ClipboardCheck className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Nuestro equipo de admisiones se pondrá en contacto contigo. También
          puedes usar la pestaña <strong>Consultar estado</strong> con tu código.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GraduationCap className="h-4 w-4 text-primary" /> Datos del aspirante
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombres *">
            <Input
              value={form.asp_nombres}
              onChange={(e) => set("asp_nombres", e.target.value)}
              placeholder="Ej. Sofía Isabel"
            />
          </Field>
          <Field label="Apellidos *">
            <Input
              value={form.asp_apellidos}
              onChange={(e) => set("asp_apellidos", e.target.value)}
              placeholder="Ej. Peña Rosario"
            />
          </Field>
          <Field label="Grado al que aspira *">
            <Select
              value={form.grado_id}
              onValueChange={(v) => set("grado_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el grado…" />
              </SelectTrigger>
              <SelectContent>
                {grados.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sexo">
            <Select
              value={form.asp_sexo}
              onValueChange={(v) => set("asp_sexo", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fecha de nacimiento *">
            <Input
              type="date"
              value={form.asp_nacimiento}
              onChange={(e) => set("asp_nacimiento", e.target.value)}
            />
          </Field>
          <Field label="Nacionalidad">
            <Input
              value={form.asp_nacionalidad}
              onChange={(e) => set("asp_nacionalidad", e.target.value)}
            />
          </Field>
          <Field label="Colegio de procedencia" full>
            <Input
              value={form.colegio_proc}
              onChange={(e) => set("colegio_proc", e.target.value)}
              placeholder="Si aplica"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Datos del padre/madre/tutor
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombres *">
            <Input
              value={form.tutor_nombres}
              onChange={(e) => set("tutor_nombres", e.target.value)}
            />
          </Field>
          <Field label="Apellidos *">
            <Input
              value={form.tutor_apellidos}
              onChange={(e) => set("tutor_apellidos", e.target.value)}
            />
          </Field>
          <Field label="Parentesco">
            <Select
              value={form.tutor_parentesco}
              onValueChange={(v) => set("tutor_parentesco", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARENTESCOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Teléfono *">
            <Input
              value={form.tutor_telefono}
              onChange={(e) => set("tutor_telefono", e.target.value)}
              placeholder="809-000-0000"
              inputMode="tel"
            />
          </Field>
          <Field label="Correo electrónico">
            <Input
              type="email"
              value={form.tutor_email}
              onChange={(e) => set("tutor_email", e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </Field>
          <Field label="Cédula">
            <Input
              value={form.tutor_cedula}
              onChange={(e) => set("tutor_cedula", e.target.value)}
              placeholder="000-0000000-0"
            />
          </Field>
          <Field label="Mensaje (opcional)" full>
            <Textarea
              value={form.mensaje}
              onChange={(e) => set("mensaje", e.target.value)}
              rows={3}
              placeholder="Cuéntanos por qué te interesa nuestro colegio…"
            />
          </Field>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Enviar solicitud
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Los datos se usan únicamente para el proceso de admisión.
      </p>
    </form>
  );
}

function ConsultaForm() {
  const [codigo, setCodigo] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [res, setRes] = React.useState<ConsultaAdmision | null>(null);

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = codigo.trim();
    if (!c) return;
    setLoading(true);
    setRes(null);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .rpc("consultar_solicitud_admision", { p_codigo: c })
        .maybeSingle<ConsultaAdmision>();
      setRes(
        data ?? {
          existe: false,
          codigo: c,
          aspirante: null,
          grado: null,
          estado: null,
          actualizada: null,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <form onSubmit={consultar} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej. ADM-2026-0001"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading || !codigo.trim()} className="gap-1.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Consultar
        </Button>
      </form>

      {res && (
        <div className="mt-5">
          {res.existe && res.estado ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-medium">
                  {res.codigo}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${ESTADO_SOLICITUD_STYLES[res.estado]}`}
                >
                  {ESTADO_SOLICITUD_LABELS[res.estado as EstadoSolicitud]}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <Row label="Aspirante" value={res.aspirante ?? "—"} />
                <Row label="Grado" value={res.grado ?? "—"} />
                <Row
                  label="Última actualización"
                  value={res.actualizada ? formatFechaRD(res.actualizada) : "—"}
                />
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Por privacidad solo se muestran las iniciales del aspirante.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">
                Código no encontrado
              </p>
              <p className="text-muted-foreground">
                No existe una solicitud con el código{" "}
                <span className="font-mono">{res.codigo}</span>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
