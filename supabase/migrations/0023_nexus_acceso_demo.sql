-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · NEXUS — Control de Acceso Demo (JM Nexus Designs)     ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Capa super-admin POR ENCIMA de los 7 roles del colegio. Cuentas de   ║
-- ║  acceso demo con vigencia (días) validada EN SERVIDOR. Aislamiento    ║
-- ║  total: un cliente no ve ni toca otras cuentas ni el panel Nexus.     ║
-- ║  Sin credenciales en el esquema: el super-admin se crea con           ║
-- ║  nexus_bootstrap() (solo service_role) durante el despliegue.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Super-admins (identidad JM Nexus, sobre los roles del colegio) ─────
create table if not exists public.super_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins enable row level security;
alter table public.super_admins force row level security;
-- Cada quien solo puede ver SU propia fila (no recursivo). Un no-super no ve
-- ninguna; nadie la escribe por API. es_superadmin() (DEFINER) es la fuente
-- de verdad para el resto de políticas.
drop policy if exists super_admins_select on public.super_admins;
create policy super_admins_select on public.super_admins
  for select to authenticated
  using (profile_id = (select auth.uid()));

-- ── ¿El usuario actual es super-admin? (requerido por las políticas) ───
create or replace function private.es_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.super_admins where profile_id = (select auth.uid()));
$$;
revoke all on function private.es_superadmin() from public, anon;
grant execute on function private.es_superadmin() to authenticated, service_role;

create or replace function public.es_superadmin()
returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.es_superadmin(); $$;
revoke all on function public.es_superadmin() from public, anon;
grant execute on function public.es_superadmin() to authenticated, service_role;

-- ── Cuentas de acceso demo (con vigencia) ──────────────────────────────
create table if not exists public.accesos_demo (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete cascade,
  etiqueta    text not null,
  email       text not null,
  vence_at    timestamptz,            -- null = sin vencimiento
  activa      boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_accesos_demo_updated_at on public.accesos_demo;
create trigger trg_accesos_demo_updated_at
  before update on public.accesos_demo
  for each row execute function public.set_updated_at();

alter table public.accesos_demo enable row level security;
alter table public.accesos_demo force row level security;
-- Solo el super-admin ve/gestiona; los clientes demo NO tienen acceso (el
-- cliente consulta su propio estado por RPC DEFINER, nunca a la tabla).
drop policy if exists accesos_demo_super on public.accesos_demo;
create policy accesos_demo_super on public.accesos_demo
  for all to authenticated
  using (private.es_superadmin())
  with check (private.es_superadmin());

-- ── Estado del acceso demo del usuario actual (gate + aviso) ───────────
create or replace function private.mi_acceso_demo()
returns table (
  activa boolean, vence_at timestamptz, dias_restantes int,
  sin_vencimiento boolean, bloqueado boolean)
language sql stable security definer set search_path = ''
as $$
  select a.activa, a.vence_at,
    case when a.vence_at is null then null
      else ceil(extract(epoch from (a.vence_at - now())) / 86400)::int end,
    a.vence_at is null,
    (not a.activa) or (a.vence_at is not null and a.vence_at < now())
  from public.accesos_demo a
  where a.profile_id = (select auth.uid());
$$;
revoke all on function private.mi_acceso_demo() from public, anon;
grant execute on function private.mi_acceso_demo() to authenticated, service_role;

create or replace function public.mi_acceso_demo()
returns table (
  activa boolean, vence_at timestamptz, dias_restantes int,
  sin_vencimiento boolean, bloqueado boolean)
language sql stable security invoker set search_path = ''
as $$ select * from private.mi_acceso_demo(); $$;
revoke all on function public.mi_acceso_demo() from public, anon;
grant execute on function public.mi_acceso_demo() to authenticated, service_role;

-- ── Helper interno: crear usuario en auth (no expuesto) ────────────────
create or replace function private.crear_usuario_auth(
  p_email text, p_password text, p_nombre text, p_rol public.app_role)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid; v_instance uuid;
begin
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'Ya existe una cuenta con ese correo.' using errcode = 'unique_violation';
  end if;
  select coalesce((select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid) into v_instance;
  v_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values (
    v_instance, v_uid, 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre_completo', p_nombre));
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email)),
    'email', now(), now(), now());
  update public.profiles
    set role = p_rol, status = 'activo', nombre_completo = p_nombre
    where id = v_uid;
  return v_uid;
end;
$$;
revoke all on function private.crear_usuario_auth(text, text, text, public.app_role)
  from public, anon, authenticated;

-- ── Bootstrap del primer super-admin (solo service_role, idempotente) ──
create or replace function public.nexus_bootstrap(
  p_email text, p_password text, p_nombre text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid;
begin
  if exists (select 1 from public.super_admins) then
    raise exception 'Nexus ya fue inicializado.';
  end if;
  v_uid := private.crear_usuario_auth(p_email, p_password, p_nombre, 'director');
  insert into public.super_admins (profile_id) values (v_uid);
  return v_uid;
end;
$$;
revoke all on function public.nexus_bootstrap(text, text, text) from public, anon, authenticated;
grant execute on function public.nexus_bootstrap(text, text, text) to service_role;

-- ══════════════════════════════════════════════════════════════════════
--  Panel Nexus (private DEFINER + wrapper public INVOKER; guardia super).
-- ══════════════════════════════════════════════════════════════════════

-- Crear cuenta de acceso demo.
create or replace function private.nexus_crear_acceso(
  p_email text, p_password text, p_etiqueta text, p_dias int)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid; v_vence timestamptz;
begin
  if not private.es_superadmin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;
  v_uid := private.crear_usuario_auth(p_email, p_password, p_etiqueta, 'director');
  v_vence := case when p_dias is null then null
    else date_trunc('minute', now()) + (p_dias || ' days')::interval end;
  insert into public.accesos_demo (profile_id, etiqueta, email, vence_at, created_by)
  values (v_uid, p_etiqueta, lower(p_email), v_vence, (select auth.uid()));
  return v_uid;
end;
$$;
revoke all on function private.nexus_crear_acceso(text, text, text, int) from public, anon;
grant execute on function private.nexus_crear_acceso(text, text, text, int) to authenticated, service_role;

create or replace function public.nexus_crear_acceso(
  p_email text, p_password text, p_etiqueta text, p_dias int)
returns uuid
language sql security invoker set search_path = ''
as $$ select private.nexus_crear_acceso(p_email, p_password, p_etiqueta, p_dias); $$;
revoke all on function public.nexus_crear_acceso(text, text, text, int) from public, anon;
grant execute on function public.nexus_crear_acceso(text, text, text, int) to authenticated, service_role;

-- Listar cuentas (con días restantes y estado).
create or replace function private.nexus_listar_accesos()
returns table (
  id uuid, etiqueta text, email text, vence_at timestamptz,
  dias_restantes int, activa boolean, estado text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.es_superadmin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select a.id, a.etiqueta, a.email, a.vence_at,
      case when a.vence_at is null then null
        else ceil(extract(epoch from (a.vence_at - now())) / 86400)::int end,
      a.activa,
      case
        when not a.activa then 'revocada'
        when a.vence_at is null then 'ilimitada'
        when a.vence_at < now() then 'vencida'
        else 'vigente'
      end,
      a.created_at
    from public.accesos_demo a
    order by a.created_at desc;
end;
$$;
revoke all on function private.nexus_listar_accesos() from public, anon;
grant execute on function private.nexus_listar_accesos() to authenticated, service_role;

create or replace function public.nexus_listar_accesos()
returns table (
  id uuid, etiqueta text, email text, vence_at timestamptz,
  dias_restantes int, activa boolean, estado text, created_at timestamptz)
language sql stable security invoker set search_path = ''
as $$ select * from private.nexus_listar_accesos(); $$;
revoke all on function public.nexus_listar_accesos() from public, anon;
grant execute on function public.nexus_listar_accesos() to authenticated, service_role;

-- Renovar / extender (p_dias null = sin vencimiento). Reactiva la cuenta.
create or replace function private.nexus_renovar(p_id uuid, p_dias int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_base timestamptz; v_actual timestamptz;
begin
  if not private.es_superadmin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  if p_dias is null then
    update public.accesos_demo set vence_at = null, activa = true where id = p_id;
  else
    select vence_at into v_actual from public.accesos_demo where id = p_id;
    -- Extiende desde hoy o desde el vencimiento futuro, lo que sea mayor.
    v_base := greatest(date_trunc('minute', now()), coalesce(v_actual, now()));
    update public.accesos_demo
      set vence_at = v_base + (p_dias || ' days')::interval, activa = true
      where id = p_id;
  end if;
end;
$$;
revoke all on function private.nexus_renovar(uuid, int) from public, anon;
grant execute on function private.nexus_renovar(uuid, int) to authenticated, service_role;

create or replace function public.nexus_renovar(p_id uuid, p_dias int)
returns void language sql security invoker set search_path = ''
as $$ select private.nexus_renovar(p_id, p_dias); $$;
revoke all on function public.nexus_renovar(uuid, int) from public, anon;
grant execute on function public.nexus_renovar(uuid, int) to authenticated, service_role;

-- Revocar (bloquea el acceso sin borrar la cuenta).
create or replace function private.nexus_revocar(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.es_superadmin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  update public.accesos_demo set activa = false where id = p_id;
end;
$$;
revoke all on function private.nexus_revocar(uuid) from public, anon;
grant execute on function private.nexus_revocar(uuid) to authenticated, service_role;

create or replace function public.nexus_revocar(p_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.nexus_revocar(p_id); $$;
revoke all on function public.nexus_revocar(uuid) from public, anon;
grant execute on function public.nexus_revocar(uuid) to authenticated, service_role;

-- Resembrar: restaura la configuración mutable del demo a su línea base.
-- (Los libros contables inmutables son permanentes por diseño.)
create or replace function private.nexus_resembrar_demo()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.es_superadmin() then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  update public.config_financiera
    set bloqueo_por_morosidad = false, dias_gracia = 15;
  update public.config_nomina
    set afp_pct = 2.8700, sfs_pct = 3.0400;
end;
$$;
revoke all on function private.nexus_resembrar_demo() from public, anon;
grant execute on function private.nexus_resembrar_demo() to authenticated, service_role;

create or replace function public.nexus_resembrar_demo()
returns void language sql security invoker set search_path = ''
as $$ select private.nexus_resembrar_demo(); $$;
revoke all on function public.nexus_resembrar_demo() from public, anon;
grant execute on function public.nexus_resembrar_demo() to authenticated, service_role;

commit;
