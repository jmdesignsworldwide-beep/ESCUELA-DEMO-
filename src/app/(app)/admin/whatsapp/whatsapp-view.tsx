"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { MessageCircle, Send, History, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registrarEnvioWhatsappAction, type ActionState } from "./actions";
import {
  CATEGORIA_WA_LABELS,
  type CategoriaWhatsapp,
  type DestinatarioWhatsapp,
  type EnvioWhatsappRow,
  type PlantillaWhatsapp,
} from "@/lib/whatsapp/types";
import { formatRD, formatFechaRD } from "@/lib/utils";

function resolver(
  cuerpo: string,
  d: DestinatarioWhatsapp,
  colegio: string,
): string {
  return cuerpo
    .replaceAll("{tutor}", d.tutor)
    .replaceAll("{estudiante}", d.estudiante)
    .replaceAll("{saldo}", formatRD(d.saldo))
    .replaceAll("{colegio}", colegio);
}

function waLink(telefono: string, mensaje: string): string {
  let digits = telefono.replace(/\D/g, "");
  if (digits.length === 10) digits = "1" + digits; // RD
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`;
}

export function WhatsappView({
  colegio,
  secciones,
  seccionSel,
  soloMorosos,
  plantillas,
  destinatarios,
  envios,
}: {
  colegio: string;
  secciones: { id: string; label: string }[];
  seccionSel: string;
  soloMorosos: boolean;
  plantillas: PlantillaWhatsapp[];
  destinatarios: DestinatarioWhatsapp[];
  envios: EnvioWhatsappRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const nav = (seccion: string, morosos: boolean) => {
    const p = new URLSearchParams();
    p.set("seccion", seccion);
    if (morosos) p.set("morosos", "1");
    router.replace(`${pathname}?${p.toString()}`);
  };

  const [plantillaId, setPlantillaId] = React.useState(plantillas[0]?.id ?? "");
  const plantilla = plantillas.find((p) => p.id === plantillaId) ?? null;
  const [cuerpo, setCuerpo] = React.useState(plantillas[0]?.cuerpo ?? "");
  const categoria: CategoriaWhatsapp = plantilla?.categoria ?? "general";

  const aplicarPlantilla = (id: string) => {
    setPlantillaId(id);
    const p = plantillas.find((x) => x.id === id);
    if (p) setCuerpo(p.cuerpo);
  };

  const [busca, setBusca] = React.useState("");
  const lista = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    return destinatarios.filter(
      (d) => !q || d.estudiante.toLowerCase().includes(q) || d.tutor.toLowerCase().includes(q),
    );
  }, [destinatarios, busca]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        {/* Composición */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-success" />
              Redactar mensaje
            </CardTitle>
            <CardDescription>
              Usa variables: {"{tutor}"}, {"{estudiante}"}, {"{saldo}"}, {"{colegio}"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plantilla</Label>
                <Select value={plantillaId} onValueChange={aplicarPlantilla}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <div className="flex h-10 items-center">
                  <Badge variant="secondary">
                    {CATEGORIA_WA_LABELS[categoria]}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <textarea
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Audiencia + destinatarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Destinatarios</CardTitle>
            <CardDescription>
              {destinatarios.length} familia(s) con teléfono registrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Sección</Label>
                <Select
                  value={seccionSel}
                  onValueChange={(v) => nav(v, soloMorosos)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las secciones</SelectItem>
                    {secciones.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant={soloMorosos ? "default" : "outline"}
                  className="w-full"
                  onClick={() => nav(seccionSel, !soloMorosos)}
                >
                  {soloMorosos ? "Mostrando morosos" : "Solo morosos"}
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por estudiante o tutor…"
                className="pl-9"
              />
            </div>

            <div className="max-h-[26rem] space-y-1.5 overflow-y-auto">
              {lista.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin destinatarios en este filtro.
                </p>
              ) : (
                lista.map((d) => (
                  <RecipientRow
                    key={d.estudiante_id}
                    d={d}
                    mensaje={resolver(cuerpo, d, colegio)}
                    categoria={categoria}
                    plantillaId={plantilla?.id ?? null}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Envíos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {envios.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay envíos registrados.
            </p>
          ) : (
            <ul className="space-y-2">
              {envios.map((e) => (
                <li key={e.id} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {e.estudiante ?? e.telefono}
                    </p>
                    <Badge variant="secondary" className="shrink-0 text-[0.6rem]">
                      {CATEGORIA_WA_LABELS[e.categoria as CategoriaWhatsapp] ??
                        e.categoria}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {e.mensaje}
                  </p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    {formatFechaRD(e.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecipientRow({
  d,
  mensaje,
  categoria,
  plantillaId,
}: {
  d: DestinatarioWhatsapp;
  mensaje: string;
  categoria: CategoriaWhatsapp;
  plantillaId: string | null;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    registrarEnvioWhatsappAction,
    {},
  );
  const done = React.useRef(false);
  React.useEffect(() => {
    if (state.error && !done.current) {
      done.current = true;
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
    >
      <input type="hidden" name="estudiante_id" value={d.estudiante_id} />
      <input type="hidden" name="telefono" value={d.telefono} />
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="mensaje" value={mensaje} />
      <input type="hidden" name="plantilla_id" value={plantillaId ?? ""} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{d.estudiante}</p>
        <p className="truncate text-xs text-muted-foreground">
          {d.tutor} · {d.telefono}
          {d.saldo > 0 ? ` · ${formatRD(d.saldo)}` : ""}
        </p>
      </div>
      <Button
        type="submit"
        size="sm"
        variant="success"
        className="shrink-0 gap-1.5"
        onClick={() => window.open(waLink(d.telefono, mensaje), "_blank")}
      >
        <Send className="h-3.5 w-3.5" />
        WhatsApp
      </Button>
    </form>
  );
}
