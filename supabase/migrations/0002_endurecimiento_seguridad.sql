-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 1 — Endurecimiento de seguridad                    ║
-- ║  Deja la Supabase Security Advisor limpia.                            ║
-- ║                                                                        ║
-- ║  Patrón recomendado por Supabase: las funciones SECURITY DEFINER      ║
-- ║  usadas por políticas RLS se mueven a un esquema `private` NO expuesto ║
-- ║  por PostgREST. Así las políticas siguen funcionando (authenticated    ║
-- ║  conserva EXECUTE) pero las funciones dejan de ser invocables vía      ║
-- ║  /rest/v1/rpc, eliminando los avisos del advisor.                     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Esquema privado (no expuesto a la API) ──────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ── Helpers de RLS en `private` ─────────────────────────────────────────
create or replace function private.rol_actual()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select p.role from public.profiles p where p.id = (select auth.uid()); $$;

create or replace function private.es_activo()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'activo'
  );
$$;

create or replace function private.tiene_rol(variadic roles public.app_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'activo'
      and p.role = any(roles)
  );
$$;

revoke all on function private.rol_actual() from public;
revoke all on function private.es_activo() from public;
revoke all on function private.tiene_rol(public.app_role[]) from public;
grant execute on function private.rol_actual() to authenticated, service_role;
grant execute on function private.es_activo() to authenticated, service_role;
grant execute on function private.tiene_rol(public.app_role[]) to authenticated, service_role;

-- ── Recrear políticas apuntando a private.* ─────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.tiene_rol('director', 'coordinador', 'secretaria')
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (private.tiene_rol('director'));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (private.tiene_rol('director'))
  with check (private.tiene_rol('director'));

drop policy if exists sedes_select on public.sedes;
create policy sedes_select on public.sedes
  for select to authenticated using (private.es_activo());

drop policy if exists sedes_write on public.sedes;
create policy sedes_write on public.sedes
  for all to authenticated
  using (private.tiene_rol('director'))
  with check (private.tiene_rol('director'));

drop policy if exists anios_select on public.anios_escolares;
create policy anios_select on public.anios_escolares
  for select to authenticated using (private.es_activo());

drop policy if exists anios_write on public.anios_escolares;
create policy anios_write on public.anios_escolares
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

drop policy if exists bitacora_select on public.bitacora;
create policy bitacora_select on public.bitacora
  for select to authenticated using (private.tiene_rol('director'));

-- docente_pins: política deny-all explícita (mantiene bloqueo total y
-- silencia el INFO rls_enabled_no_policy). service_role sigue accediendo
-- por bypass de RLS para la RPC de verificación de PIN.
drop policy if exists docente_pins_deny on public.docente_pins;
create policy docente_pins_deny on public.docente_pins
  for all to authenticated using (false) with check (false);

-- ── Eliminar helpers públicos (ya sin referencias de políticas) ─────────
drop function if exists public.tiene_rol(public.app_role[]);
drop function if exists public.es_activo();
drop function if exists public.rol_actual();

-- ── Mover handle_new_user a private y re-apuntar el trigger ─────────────
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_sede uuid;
begin
  select id into v_sede from public.sedes order by created_at asc limit 1;
  insert into public.profiles (id, sede_id, nombre_completo, email, status)
  values (
    new.id, v_sede,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', new.email, 'Sin nombre'),
    new.email, 'inactivo'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
drop function if exists public.handle_new_user();

-- ── Mover registrar_bitacora a private ──────────────────────────────────
create or replace function private.registrar_bitacora(
  p_accion text,
  p_entidad text default null,
  p_entidad_id text default null,
  p_detalle jsonb default null,
  p_ip text default null,
  p_user_agent text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_email text;
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
revoke all on function private.registrar_bitacora(text, text, text, jsonb, text, text) from public, anon;
grant execute on function private.registrar_bitacora(text, text, text, jsonb, text, text) to authenticated, service_role;
drop function if exists public.registrar_bitacora(text, text, text, jsonb, text, text);

-- ── Higiene: revocar EXECUTE público de funciones de trigger ────────────
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.impedir_cambios() from public, anon, authenticated;

commit;
