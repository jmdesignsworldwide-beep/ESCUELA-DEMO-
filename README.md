# JM ESCOLAR — Sistema de Gestión Académica Integral

Demo comercial para colegios privados de la **República Dominicana**.
Cumplimiento MINERD, portal de familias móvil-primero, finanzas y nómina RD,
seguridad Fort Knox desde la línea uno.

> Construcción **por tandas**. Este repositorio corresponde a la
> **TANDA 1 — Fundación, Auth y Sistema de Diseño**.

## Stack

- **Next.js 14 (App Router)** + **TypeScript** (strict, sin `any`)
- **Tailwind CSS** + **shadcn/ui** — paleta Azul Académico + Dorado, ambos temas
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Framer Motion**, **Recharts**, **Zod**, **react-hook-form**
- Deploy en **Vercel**

## Puesta en marcha local

```bash
npm install
cp .env.example .env.local   # completar con los valores de tu proyecto Supabase
npm run dev
```

Variables (`.env.local`):

| Variable | Ámbito | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente | protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | jamás con `NEXT_PUBLIC_`, jamás en commits |
| `NEXT_PUBLIC_SITE_URL` | cliente | base para redirecciones de auth |

## Base de datos — protocolo de migraciones

El esquema de cada tanda se agrupa en **un solo bloque** dentro de
`supabase/migrations/`. Se aplica vía **Supabase Management API** con un
**PAT temporal** (nunca connection string, nunca por terminal de la
directora). Tras aplicar:

1. Correr la **Security Advisor** y reportar el resultado.
2. Avisar para **revocar el PAT** de inmediato.

Ningún secreto (PAT, `service_role`, claves) se imprime en chat, logs ni
commits.

### TANDA 1 — `supabase/migrations/0001_tanda1_fundacion.sql`

- Tipos: `app_role` (7 roles), `profile_status`.
- Tablas: `sedes`, `anios_escolares`, `profiles`, `docente_pins`, `bitacora`.
- **RLS ACTIVADO + FORCE** en todas las tablas, deny-all por defecto.
- Funciones `SECURITY DEFINER` con `search_path` fijo y `EXECUTE` revocado de
  `anon`: `rol_actual()`, `es_activo()`, `tiene_rol()`, `registrar_bitacora()`,
  `verificar_pin_docente()`, `handle_new_user()`.
- **Bitácora inmutable**: triggers de BD bloquean `UPDATE`/`DELETE`/`TRUNCATE`.
- Campo `sede_id` presente desde el inicio (listo para multi-sede).
- Semilla: sede por defecto + año escolar 2025–2026 (agosto→junio).

### TANDA 1 · endurecimiento — `supabase/migrations/0002_endurecimiento_seguridad.sql`

Deja la **Security Advisor limpia**. Las funciones `SECURITY DEFINER` usadas por
políticas RLS se mueven al esquema **`private`** (no expuesto por PostgREST):
las políticas siguen funcionando pero las funciones dejan de ser invocables vía
`/rest/v1/rpc`. Añade política deny-all explícita en `docente_pins` y revoca
`EXECUTE` público de las funciones de trigger.

> Resultado de la Security Advisor: **0 errores, 0 avisos bajo nuestro control**.
> El único aviso restante (`auth_leaked_password_protection`) requiere plan Pro
> de Supabase; se habilita con un toggle al actualizar el plan.

## Seguridad (Fort Knox)

- Cabeceras: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy (`next.config.mjs`).
- Toda ruta protegida por middleware; toda server action pasa por
  `requireActiveUser()` + `requireRole()` + validación **Zod**.
- Rate limiting por usuario/IP en acciones sensibles (login, PIN).
- `service_role` solo en servidor; `.env*` en `.gitignore`.

## Roles del sistema

Director · Coordinador académico · Secretaría · Docente · Contabilidad ·
Padre/Tutor · Estudiante. La visibilidad de UI y el acceso de servidor se
derivan del rol; el aislamiento entre secciones y entre familias se valida
siempre en servidor.

## Estructura

```
src/
  app/
    (auth)/      login + PIN + server actions de auth
    (app)/       shell protegido (layout con requireActiveUser) + dashboard
  components/
    ui/          primitivos shadcn/ui
    shell/       sidebar, topbar, breadcrumbs, selectores
    brand/       logo, fondo aurora
  lib/
    supabase/    clientes browser/server/admin/middleware
    auth/        requireActiveUser, requireRole, rate-limit
    validation/  esquemas Zod
supabase/migrations/   SQL por tanda
```

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run typecheck  # tsc --noEmit (strict)
npm run lint       # next lint
```
