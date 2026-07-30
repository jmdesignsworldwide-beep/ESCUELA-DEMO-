"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo";
import { COLEGIO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFechaRD } from "@/lib/utils";
import { TIPO_DOC_LABELS, type TipoDocumento } from "@/lib/docs/types";

interface Resultado {
  existe: boolean;
  folio: string | null;
  tipo: string | null;
  emitido: string | null;
  estudiante_iniciales: string | null;
}

export default function VerificarPage() {
  const [folio, setFolio] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [res, setRes] = React.useState<Resultado | null>(null);

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = folio.trim();
    if (!f) return;
    setLoading(true);
    setRes(null);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .rpc("verificar_folio_publico", { p_folio: f })
        .maybeSingle<Resultado>();
      setRes(
        data ?? {
          existe: false,
          folio: f,
          tipo: null,
          emitido: null,
          estudiante_iniciales: null,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-16 w-16" />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-foreground">
            Verificación de documentos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {COLEGIO.nombre} · Comprueba la autenticidad de un documento por su
            folio.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <form onSubmit={verificar} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                placeholder="Ej. CSRA-2026-000123"
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !folio.trim()} className="gap-1.5">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Verificar
            </Button>
          </form>

          {res && (
            <div className="mt-5">
              {res.existe ? (
                <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-6 w-6" />
                    <p className="font-semibold">Documento auténtico</p>
                  </div>
                  <dl className="space-y-1 text-sm">
                    <Row label="Folio" value={res.folio ?? "—"} mono />
                    <Row
                      label="Tipo"
                      value={
                        TIPO_DOC_LABELS[res.tipo as TipoDocumento] ??
                        res.tipo ??
                        "—"
                      }
                    />
                    <Row
                      label="Emitido"
                      value={res.emitido ? formatFechaRD(res.emitido) : "—"}
                    />
                    <Row
                      label="Estudiante"
                      value={`${res.estudiante_iniciales ?? "—"} ·  ·  ·`}
                    />
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Por privacidad solo se muestran las iniciales del estudiante.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-6 w-6" />
                    <div>
                      <p className="font-semibold">Folio no encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        No existe un documento con el folio{" "}
                        <span className="font-mono">{res.folio}</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-primary">
            Acceso institucional
          </Link>
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono font-medium" : "font-medium"}>{value}</dd>
    </div>
  );
}
