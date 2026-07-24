"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

const LABELS: Record<string, string> = {
  dashboard: "Panel",
  academico: "Académico",
  financiero: "Financiero",
  personas: "Personas",
  admin: "Administración",
  estructura: "Estructura académica",
  asistencia: "Asistencia",
  calificaciones: "Calificaciones",
  inicial: "Nivel Inicial",
  horarios: "Horarios",
  boletines: "Boletines",
  recuperacion: "Recuperación",
  facturacion: "Facturación",
  caja: "Caja y cobros",
  morosidad: "Morosidad",
  nomina: "Nómina docente",
  estudiantes: "Estudiantes",
  docentes: "Docentes y personal",
  portal: "Portal de familias",
  comunicacion: "Comunicación",
  disciplina: "Disciplina",
  inventario: "Inventario y biblioteca",
  reportes: "Reportes y dirección",
  ajustes: "Ajustes y bitácora",
};

function labelFor(segment: string): string {
  return (
    LABELS[segment] ??
    segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Inicio</span>
          </Link>
        </li>
        {segments.map((segment, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const isLast = i === segments.length - 1;
          return (
            <Fragment key={href}>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <li className="min-w-0">
                {isLast ? (
                  <span className="truncate font-medium text-foreground">
                    {labelFor(segment)}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="truncate transition-colors hover:text-foreground"
                  >
                    {labelFor(segment)}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
