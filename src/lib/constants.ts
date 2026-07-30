import type { Role } from "@/lib/types";
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  CalendarDays,
  BookOpenCheck,
  Target,
  Award,
  ClipboardList,
  CalendarCheck,
  Baby,
  FileText,
  RefreshCcw,
  Wallet,
  Receipt,
  AlertTriangle,
  Banknote,
  Users,
  UserCog,
  Contact,
  MessageSquare,
  ShieldAlert,
  Library,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

/** Identidad del colegio demo (ficticio — ningún dato real). */
export const COLEGIO = {
  nombre: "Colegio San Rafael Arcángel",
  siglas: "CSRA",
  ciudad: "Santiago de los Caballeros",
  pais: "República Dominicana",
} as const;

export const APP_NAME = "JM ESCOLAR";
export const APP_TAGLINE = "Sistema de Gestión Académica Integral";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[]; // roles con acceso a la ruta
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL: Role[] = [
  "director",
  "coordinador",
  "secretaria",
  "docente",
  "contabilidad",
  "tutor",
  "estudiante",
];

/**
 * Navegación agrupada por área. El acceso final SIEMPRE se valida en
 * servidor con requireRole(); esta lista solo controla la visibilidad de UI.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        label: "Panel",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL,
      },
    ],
  },
  {
    title: "Académico",
    items: [
      {
        label: "Estructura académica",
        href: "/academico/estructura",
        icon: GraduationCap,
        roles: ["director", "coordinador", "secretaria"],
      },
      {
        label: "Asistencia",
        href: "/academico/asistencia",
        icon: ClipboardCheck,
        roles: ["director", "coordinador", "docente"],
      },
      {
        label: "Reportes de asistencia",
        href: "/academico/asistencia-reportes",
        icon: CalendarCheck,
        roles: ["director", "coordinador", "secretaria"],
      },
      {
        label: "Calificaciones",
        href: "/academico/calificaciones",
        icon: BookOpenCheck,
        roles: ["director", "coordinador", "docente"],
      },
      {
        label: "Competencias",
        href: "/academico/competencias",
        icon: Target,
        roles: ["director", "coordinador", "docente"],
      },
      {
        label: "Boletín por competencias",
        href: "/academico/boletin-competencias",
        icon: Award,
        roles: ["director", "coordinador", "secretaria", "docente"],
      },
      {
        label: "Nivel Inicial",
        href: "/academico/inicial",
        icon: Baby,
        roles: ["director", "coordinador", "docente"],
      },
      {
        label: "Horarios",
        href: "/academico/horarios",
        icon: CalendarDays,
        roles: ["director", "coordinador", "docente"],
      },
      {
        label: "Boletines",
        href: "/academico/boletines",
        icon: FileText,
        roles: ["director", "coordinador", "secretaria"],
      },
      {
        label: "Recuperación",
        href: "/academico/recuperacion",
        icon: RefreshCcw,
        roles: ["director", "coordinador"],
      },
      {
        label: "Actas y promedios",
        href: "/academico/actas",
        icon: ClipboardList,
        roles: ["director", "coordinador", "secretaria"],
      },
    ],
  },
  {
    title: "Financiero",
    items: [
      {
        label: "Facturación",
        href: "/financiero/facturacion",
        icon: Wallet,
        roles: ["director", "contabilidad"],
      },
      {
        label: "Caja y cobros",
        href: "/financiero/caja",
        icon: Receipt,
        roles: ["director", "contabilidad"],
      },
      {
        label: "Morosidad",
        href: "/financiero/morosidad",
        icon: AlertTriangle,
        roles: ["director", "contabilidad"],
      },
      {
        label: "Nómina docente",
        href: "/financiero/nomina",
        icon: Banknote,
        roles: ["director", "contabilidad"],
      },
    ],
  },
  {
    title: "Personas",
    items: [
      {
        label: "Estudiantes",
        href: "/personas/estudiantes",
        icon: Users,
        roles: ["director", "coordinador", "secretaria"],
      },
      {
        label: "Docentes y personal",
        href: "/personas/docentes",
        icon: UserCog,
        roles: ["director", "coordinador", "secretaria"],
      },
      {
        label: "Portal de familias",
        href: "/portal",
        icon: Contact,
        roles: ["tutor", "estudiante"],
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        label: "Comunicación",
        href: "/admin/comunicacion",
        icon: MessageSquare,
        roles: ["director", "coordinador", "secretaria"],
      },
      {
        label: "Disciplina",
        href: "/admin/disciplina",
        icon: ShieldAlert,
        roles: ["director", "coordinador"],
      },
      {
        label: "Inventario y biblioteca",
        href: "/admin/inventario",
        icon: Library,
        roles: ["director", "secretaria"],
      },
      {
        label: "Reportes y dirección",
        href: "/admin/reportes",
        icon: BarChart3,
        roles: ["director", "coordinador", "contabilidad"],
      },
      {
        label: "Ajustes y bitácora",
        href: "/admin/ajustes",
        icon: Settings,
        roles: ["director"],
      },
    ],
  },
];
