-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 1 — Fundación, Auth y Seguridad Fort Knox          ║
-- ║  Bloque único de migración. Aplicar vía Supabase Management API.       ║
-- ║                                                                        ║
-- ║  Principios (PROMPT MAESTRO §5):                                       ║
-- ║   · RLS ACTIVADO + FORCE en TODAS las tablas, deny-all por defecto.    ║
-- ║   · SECURITY DEFINER con search_path fijo y EXECUTE revocado de anon.  ║
-- ║   · Tablas inmutables a nivel de BD (bitácora): sin UPDATE/DELETE/     ║
-- ║     TRUNCATE.                                                          ║
-- ║   · Campo sede_id presente desde el inicio (listo para multi-sede).    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Extensiones ─────────────────────────────────────────────────────────
create extension if not exists pgcrypto with schema extensions;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'director',
      'coordinador',
      'secretaria',
      'docente',
      'contabilidad',
      'tutor',
      'estudiante'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type public.profile_status as enum (
      'activo',
      'inactivo',
      'suspendido'
    );
  end if;
end $$;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.sedes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  codigo      text not null unique,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.anios_escolares (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  nombre        text not null,
  fecha_inicio  date not null,
  fecha_fin     date not null,
  activo        boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (sede_id, nombre)
);

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  sede_id          uuid not null references public.sedes(id),
  nombre_completo  text not null,
  role             public.app_role not null default 'estudiante',
  status           public.profile_status not null default 'inactivo',
  email            text,
  telefono         text,
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- PINs de docentes (pase de lista rápido). Hash con bcrypt (pgcrypto).
-- Tabla sensible: deny-all total; solo accesible vía SECURITY DEFINER.
create table if not exists public.docente_pins (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete cascade,
  codigo      text not null unique,
  pin_hash    text not null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Bitácora de auditoría inviolable. Solo INSERT (vía función); jamás
-- UPDATE/DELETE/TRUNCATE (bloqueado por trigger a nivel de BD).
create table if not exists public.bitacora (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_email text,
  accion      text not null,
  entidad     text,
  entidad_id  text,
  detalle     jsonb,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ── Funciones auxiliares (SECURITY DEFINER, search_path fijo) ───────────
-- Evitan recursión de políticas RLS: al ser SECURITY DEFINER propiedad de
-- un rol con BYPASSRLS, no re-disparan las policies de profiles.

create or replace function public.rol_actual()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.es_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'activo'
  );
$$;

create or replace function public.tiene_rol(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'activo'
      and p.role = any(roles)
  );
$$;

-- Mantener updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Inmutabilidad a nivel de base de datos.
create or replace function public.impedir_cambios()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registro inmutable: operación % no permitida sobre %',
    tg_op, tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists trg_bitacora_no_update on public.bitacora;
create trigger trg_bitacora_no_update
  before update or delete on public.bitacora
  for each row execute function public.impedir_cambios();

drop trigger if exists trg_bitacora_no_truncate on public.bitacora;
create trigger trg_bitacora_no_truncate
  before truncate on public.bitacora
  for each statement execute function public.impedir_cambios();

-- Registro de bitácora (única vía de escritura). Propiedad del definer.
create or replace function public.registrar_bitacora(
  p_accion text,
  p_entidad text default null,
  p_entidad_id text default null,
  p_detalle jsonb default null,
  p_ip text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = (select auth.uid());
  insert into public.bitacora(
    actor_id, actor_email, accion, entidad, entidad_id, detalle, ip, user_agent
  )
  values (
    (select auth.uid()), v_email, p_accion, p_entidad, p_entidad_id,
    p_detalle, p_ip, p_user_agent
  );
end;
$$;

-- Verificación de PIN docente. Devuelve el correo si es válido; nunca el hash.
create or replace function public.verificar_pin_docente(
  p_codigo text,
  p_pin text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_profile_id uuid;
  v_email text;
begin
  select dp.pin_hash, dp.profile_id
    into v_hash, v_profile_id
  from public.docente_pins dp
  join public.profiles p on p.id = dp.profile_id
  where dp.codigo = p_codigo
    and dp.activo
    and p.status = 'activo'
    and p.role = 'docente';

  if v_hash is null then
    return null;
  end if;

  if extensions.crypt(p_pin, v_hash) <> v_hash then
    return null;
  end if;

  select email into v_email from auth.users where id = v_profile_id;
  return v_email;
end;
$$;

-- Alta de perfil al crear un usuario en auth. Estado inicial 'inactivo':
-- un usuario recién creado no puede hacer nada hasta que un director lo active.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sede uuid;
begin
  select id into v_sede from public.sedes order by created_at asc limit 1;

  insert into public.profiles (id, sede_id, nombre_completo, email, status)
  values (
    new.id,
    v_sede,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', new.email, 'Sin nombre'),
    new.email,
    'inactivo'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS: ACTIVADO + FORCE en TODAS las tablas ───────────────────────────
alter table public.sedes            enable row level security;
alter table public.sedes            force row level security;
alter table public.anios_escolares  enable row level security;
alter table public.anios_escolares  force row level security;
alter table public.profiles         enable row level security;
alter table public.profiles         force row level security;
alter table public.docente_pins     enable row level security;
alter table public.docente_pins     force row level security;
alter table public.bitacora         enable row level security;
alter table public.bitacora         force row level security;

-- ── Políticas ───────────────────────────────────────────────────────────
-- profiles: cada quien ve su perfil; dirección/coordinación/secretaría ven
-- todos. Escritura solo del director.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.tiene_rol('director', 'coordinador', 'secretaria')
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.tiene_rol('director'));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.tiene_rol('director'))
  with check (public.tiene_rol('director'));

-- sedes: lectura para usuarios activos; escritura solo director.
drop policy if exists sedes_select on public.sedes;
create policy sedes_select on public.sedes
  for select to authenticated
  using (public.es_activo());

drop policy if exists sedes_write on public.sedes;
create policy sedes_write on public.sedes
  for all to authenticated
  using (public.tiene_rol('director'))
  with check (public.tiene_rol('director'));

-- anios_escolares: lectura para activos; escritura dirección/coordinación.
drop policy if exists anios_select on public.anios_escolares;
create policy anios_select on public.anios_escolares
  for select to authenticated
  using (public.es_activo());

drop policy if exists anios_write on public.anios_escolares;
create policy anios_write on public.anios_escolares
  for all to authenticated
  using (public.tiene_rol('director', 'coordinador'))
  with check (public.tiene_rol('director', 'coordinador'));

-- docente_pins: SIN políticas => deny-all para anon y authenticated.
-- Solo accesible por SECURITY DEFINER / service_role. (Contiene hashes.)

-- bitacora: solo el director puede leer. Escritura únicamente vía
-- registrar_bitacora(); UPDATE/DELETE/TRUNCATE bloqueados por trigger.
drop policy if exists bitacora_select on public.bitacora;
create policy bitacora_select on public.bitacora
  for select to authenticated
  using (public.tiene_rol('director'));

-- ── Endurecimiento de EXECUTE (Fort Knox §5.9) ──────────────────────────
-- Revocar de public/anon; conceder solo donde corresponde.
revoke all on function public.verificar_pin_docente(text, text) from public, anon, authenticated;
grant execute on function public.verificar_pin_docente(text, text) to service_role;

revoke all on function public.registrar_bitacora(text, text, text, jsonb, text, text) from public, anon;
grant execute on function public.registrar_bitacora(text, text, text, jsonb, text, text) to authenticated, service_role;

revoke all on function public.rol_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated, service_role;
revoke all on function public.es_activo() from public, anon;
grant execute on function public.es_activo() to authenticated, service_role;
revoke all on function public.tiene_rol(public.app_role[]) from public, anon;
grant execute on function public.tiene_rol(public.app_role[]) to authenticated, service_role;

-- ── Semilla mínima: sede por defecto + año escolar dominicano ───────────
insert into public.sedes (nombre, codigo, activa)
values ('Sede Principal', 'SEDE-01', true)
on conflict (codigo) do nothing;

insert into public.anios_escolares (sede_id, nombre, fecha_inicio, fecha_fin, activo)
select s.id, '2025–2026', date '2025-08-01', date '2026-06-30', true
from public.sedes s
where s.codigo = 'SEDE-01'
on conflict (sede_id, nombre) do nothing;

commit;

-- ── Verificación posterior sugerida (Security Advisor) ──────────────────
-- Esperado: sin tablas con RLS deshabilitado, sin funciones SECURITY DEFINER
-- con search_path mutable, sin políticas permisivas peligrosas.
