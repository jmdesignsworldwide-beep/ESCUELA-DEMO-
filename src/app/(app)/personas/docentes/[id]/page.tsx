import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  GraduationCap,
  IdCard,
  Mail,
  MapPin,
  Phone,
  FileText,
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
import { EstadoEmpleadoSelector } from "./estado-empleado-selector";
import { AsignacionesManager, type AsignacionRow } from "./asignaciones-manager";
import {
  getSedeActiva,
  getAnioActivo,
  getNiveles,
  getGrados,
  getSecciones,
  getAsignaturas,
} from "@/lib/academic/queries";
import {
  getEmpleado,
  getAsignacionesEmpleado,
  getDocumentosEmpleado,
  getFotoEmpleadoSignedUrl,
} from "@/lib/staff/queries";
import {
  ESTADO_EMPLEADO_LABELS,
  TIPO_EMPLEADO_LABELS,
  nombreEmpleado,
  type EstadoEmpleado,
} from "@/lib/staff/types";
import { formatFechaRD, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Expediente del empleado" };

const ESTADO_VARIANT: Record<
  EstadoEmpleado,
  "success" | "warning" | "secondary"
> = {
  activo: "success",
  licencia: "warning",
  inactivo: "secondary",
};

export default async function ExpedienteEmpleadoPage({
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
  const canAsignar = profile.role === "director" || profile.role === "coordinador";

  const empleado = await getEmpleado(params.id);
  if (!empleado) notFound();

  const sede = await getSedeActiva();
  const [anio, niveles, grados, asignaturas, asignaciones, documentos, fotoUrl] =
    await Promise.all([
      getAnioActivo(),
      sede ? getNiveles(sede.id) : Promise.resolve([]),
      sede ? getGrados(sede.id) : Promise.resolve([]),
      sede ? getAsignaturas(sede.id) : Promise.resolve([]),
      getAsignacionesEmpleado(empleado.id),
      getDocumentosEmpleado(empleado.id),
      getFotoEmpleadoSignedUrl(empleado.foto_path),
    ]);
  const secciones = anio ? await getSecciones(anio.id) : [];

  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));
  const gradoPorId = new Map(grados.map((g) => [g.id, g]));
  const seccionPorId = new Map(secciones.map((s) => [s.id, s]));
  const asignaturaPorId = new Map(asignaturas.map((a) => [a.id, a]));

  const asignacionRows: AsignacionRow[] = asignaciones
    .map((a) => {
      const sec = seccionPorId.get(a.seccion_id);
      const g = sec ? gradoPorId.get(sec.grado_id) : undefined;
      const n = g ? nivelPorId.get(g.nivel_id) : undefined;
      return {
        id: a.id,
        asignaturaNombre: asignaturaPorId.get(a.asignatura_id)?.nombre ?? "—",
        seccionLabel:
          g && sec ? `${n?.nombre ?? ""} · ${g.nombre} "${sec.nombre}"` : "—",
        horas: a.horas_semanales,
      };
    })
    .sort((a, b) => a.asignaturaNombre.localeCompare(b.asignaturaNombre));

  const esDocente = empleado.tipo === "docente";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link href="/personas/docentes">
          <ArrowLeft className="h-4 w-4" />
          Docentes y personal
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="aurora-bg h-20 w-full" />
        <CardContent className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-24 w-24 border-4 border-card shadow-card">
              {fotoUrl && (
                <Image
                  src={fotoUrl}
                  alt={nombreEmpleado(empleado)}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              )}
              <AvatarFallback className="text-2xl">
                {initials(nombreEmpleado(empleado))}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <h1 className="font-serif text-2xl font-semibold">
                {nombreEmpleado(empleado)}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{empleado.codigo}</span>
                <span>· {empleado.cargo}</span>
                <Badge variant="secondary">
                  {TIPO_EMPLEADO_LABELS[empleado.tipo]}
                </Badge>
                <Badge variant={ESTADO_VARIANT[empleado.estado]}>
                  {ESTADO_EMPLEADO_LABELS[empleado.estado]}
                </Badge>
              </div>
            </div>
          </div>
          {canWrite && (
            <EstadoEmpleadoSelector
              empleadoId={empleado.id}
              estadoActual={empleado.estado}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IdCard className="h-5 w-5 text-primary" />
              Datos del empleado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dato icon={<Briefcase className="h-4 w-4" />} label="Cargo">
              {empleado.cargo}
            </Dato>
            <Dato icon={<GraduationCap className="h-4 w-4" />} label="Título">
              {empleado.titulo_academico ?? "—"}
            </Dato>
            <Dato icon={<IdCard className="h-4 w-4" />} label="Cédula">
              {empleado.cedula ?? "—"}
            </Dato>
            <Dato icon={<Phone className="h-4 w-4" />} label="Teléfono">
              {empleado.telefono ?? "—"}
            </Dato>
            <Dato icon={<Mail className="h-4 w-4" />} label="Correo">
              {empleado.email ?? "—"}
            </Dato>
            <Dato icon={<MapPin className="h-4 w-4" />} label="Dirección">
              {empleado.direccion ?? "—"}
            </Dato>
            <Dato icon={<CalendarDays className="h-4 w-4" />} label="Ingreso">
              {empleado.fecha_ingreso
                ? formatFechaRD(empleado.fecha_ingreso)
                : "—"}
            </Dato>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <AsignacionesManager
            empleadoId={empleado.id}
            esDocente={esDocente}
            canWrite={canAsignar}
            rows={asignacionRows}
            niveles={niveles}
            grados={grados}
            secciones={secciones}
            asignaturas={asignaturas}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentos.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin documentos en el expediente. Los documentos se guardan en
                  almacenamiento privado y se acceden por enlace firmado.
                </p>
              ) : (
                <ul className="space-y-2">
                  {documentos.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <span className="font-medium">{d.nombre}</span>
                      <span className="text-muted-foreground">{d.tipo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
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
