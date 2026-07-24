import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Cake,
  Droplet,
  HeartPulse,
  IdCard,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/require";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoSelector } from "./estado-selector";
import { getSedeActiva, getAnioActivo, getSecciones, getGrados, getNiveles } from "@/lib/academic/queries";
import {
  getEstudiante,
  getTutoresDeEstudiante,
  getHermanos,
  getMatriculasEstudiante,
  getFotoSignedUrl,
} from "@/lib/students/queries";
import {
  ESTADO_ESTUDIANTE_LABELS,
  PARENTESCO_LABELS,
  TIPO_DOCUMENTO_LABELS,
  edad,
  nombreCompleto,
  type EstadoEstudiante,
} from "@/lib/students/types";
import { formatFechaRD, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Expediente del estudiante" };

const ESTADO_VARIANT: Record<
  EstadoEstudiante,
  "success" | "secondary" | "warning" | "destructive"
> = {
  activo: "success",
  retirado: "destructive",
  egresado: "secondary",
  transferido: "warning",
};

export default async function ExpedientePage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireRole([
    "director",
    "coordinador",
    "secretaria",
  ]);
  const canWrite = profile.role === "director" || profile.role === "secretaria";

  const estudiante = await getEstudiante(params.id);
  if (!estudiante) notFound();

  const sede = await getSedeActiva();
  const [anio, grados, niveles, tutores, hermanos, historial, fotoUrl] =
    await Promise.all([
      getAnioActivo(),
      sede ? getGrados(sede.id) : Promise.resolve([]),
      sede ? getNiveles(sede.id) : Promise.resolve([]),
      getTutoresDeEstudiante(estudiante.id),
      getHermanos(estudiante.familia_id, estudiante.id),
      getMatriculasEstudiante(estudiante.id),
      getFotoSignedUrl(estudiante.foto_path),
    ]);

  const seccionesAnio = anio ? await getSecciones(anio.id) : [];
  const seccionPorId = new Map(seccionesAnio.map((s) => [s.id, s]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));

  const seccionLabel = (seccionId: string): string => {
    const sec = seccionPorId.get(seccionId);
    if (!sec) return "—";
    const g = gradoPorId.get(sec.grado_id);
    const n = g ? nivelPorId.get(g.nivel_id) : undefined;
    return `${n?.nombre ?? ""} · ${g?.nombre ?? ""} "${sec.nombre}"`.trim();
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
        <Link href="/personas/estudiantes">
          <ArrowLeft className="h-4 w-4" />
          Estudiantes
        </Link>
      </Button>

      {/* Encabezado del expediente */}
      <Card className="overflow-hidden">
        <div className="aurora-bg h-20 w-full" />
        <CardContent className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-24 w-24 border-4 border-card shadow-card">
              {fotoUrl && (
                <Image
                  src={fotoUrl}
                  alt={nombreCompleto(estudiante)}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              )}
              <AvatarFallback className="text-2xl">
                {initials(nombreCompleto(estudiante))}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <h1 className="font-serif text-2xl font-semibold">
                {nombreCompleto(estudiante)}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{estudiante.codigo}</span>
                {estudiante.rne && <span>· RNE {estudiante.rne}</span>}
                <Badge variant={ESTADO_VARIANT[estudiante.estado]}>
                  {ESTADO_ESTUDIANTE_LABELS[estudiante.estado]}
                </Badge>
              </div>
            </div>
          </div>
          {canWrite && (
            <EstadoSelector
              estudianteId={estudiante.id}
              estadoActual={estudiante.estado}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Datos generales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IdCard className="h-5 w-5 text-primary" />
              Datos generales
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Dato icon={<Cake className="h-4 w-4" />} label="Nacimiento">
              {formatFechaRD(estudiante.fecha_nacimiento)} ·{" "}
              {edad(estudiante.fecha_nacimiento)} años
            </Dato>
            <Dato label="Sexo">
              {estudiante.sexo === "M" ? "Masculino" : "Femenino"}
            </Dato>
            <Dato icon={<MapPin className="h-4 w-4" />} label="Lugar de nacimiento">
              {estudiante.lugar_nacimiento ?? "—"}
            </Dato>
            <Dato label="Nacionalidad">{estudiante.nacionalidad}</Dato>
            <Dato icon={<IdCard className="h-4 w-4" />} label="Documento">
              {TIPO_DOCUMENTO_LABELS[estudiante.tipo_documento]}
              {estudiante.numero_documento
                ? ` · ${estudiante.numero_documento}`
                : ""}
            </Dato>
            <Dato icon={<MapPin className="h-4 w-4" />} label="Dirección">
              {estudiante.direccion ?? "—"}
            </Dato>
          </CardContent>
        </Card>

        {/* Salud */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HeartPulse className="h-5 w-5 text-destructive" />
              Salud
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dato icon={<Droplet className="h-4 w-4" />} label="Tipo de sangre">
              {estudiante.tipo_sangre ?? "—"}
            </Dato>
            <Dato label="Alergias">{estudiante.alergias ?? "Ninguna conocida"}</Dato>
            <Dato label="Condiciones médicas">
              {estudiante.condiciones_medicas ?? "Ninguna"}
            </Dato>
          </CardContent>
        </Card>

        {/* Tutores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Tutores y contactos de emergencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tutores.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin tutores vinculados.
              </p>
            )}
            {tutores.map((et) => (
              <div
                key={et.id}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {et.tutor
                      ? `${et.tutor.nombres} ${et.tutor.apellidos}`
                      : "Tutor"}
                    <Badge variant="secondary" className="ml-2">
                      {PARENTESCO_LABELS[et.parentesco]}
                    </Badge>
                    {et.principal && (
                      <Badge variant="gold" className="ml-1">
                        Principal
                      </Badge>
                    )}
                  </p>
                  {et.tutor?.telefono && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {et.tutor.telefono}
                      {et.tutor.ocupacion ? ` · ${et.tutor.ocupacion}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {et.autorizado_retirar && (
                    <Badge variant="success">Autorizado a retirar</Badge>
                  )}
                  {et.es_contacto_emergencia && (
                    <Badge variant="warning">Emergencia</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Núcleo familiar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Núcleo familiar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hermanos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin hermanos registrados en el colegio.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {hermanos.length} hermano(s) · aplica descuento por hermanos.
                </p>
                {hermanos.map((h) => (
                  <Link
                    key={h.id}
                    href={`/personas/estudiantes/${h.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:border-gold/40"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {initials(nombreCompleto(h))}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {nombreCompleto(h)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de matrícula */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Historial de matrícula</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sección</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatFechaRD(m.fecha)}</TableCell>
                    <TableCell className="capitalize">{m.tipo}</TableCell>
                    <TableCell>{seccionLabel(m.seccion_id)}</TableCell>
                    <TableCell className="capitalize">{m.estado}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Dato({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{children}</p>
    </div>
  );
}
