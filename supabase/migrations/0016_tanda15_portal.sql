-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 15 — Portal de Padres / Estudiantes             ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Aislamiento HERMÉTICO: cada tutor/estudiante ve SOLO sus datos, vía  ║
-- ║  RPCs SECURITY DEFINER que validan pertenencia con                    ║
-- ║  private.mis_estudiantes(). El BLOQUEO POR MOROSIDAD se aplica en     ║
-- ║  servidor (private.morosidad_bloquea) sobre calificaciones/boletín.   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Resolución de "mis estudiantes" para el usuario autenticado ────────
-- Tutor  → estudiantes vinculados vía estudiante_tutores + tutores.profile_id
-- Estud. → su propio expediente (estudiantes.profile_id)
create or replace function private.mis_estudiantes()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.estudiantes e
  where e.profile_id = (select auth.uid())
  union
  select et.estudiante_id
  from public.estudiante_tutores et
  join public.tutores t on t.id = et.tutor_id
  where t.profile_id = (select auth.uid());
$$;
revoke all on function private.mis_estudiantes() from public, anon;
grant execute on function private.mis_estudiantes() to authenticated, service_role;

-- ── Portal: listado de "mis estudiantes" con saldo y bandera de bloqueo ─
create or replace function public.portal_estudiantes()
returns table (
  estudiante_id uuid, nombres text, apellidos text, codigo text,
  seccion text, nivel text, pendiente numeric, bloqueado boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.nombres, e.apellidos, e.codigo,
    coalesce(g.nombre || ' ' || s.nombre, '—') as seccion,
    coalesce(nv.nombre, '—') as nivel,
    coalesce((
      select sum(c.monto) from public.cargos c
      where c.estudiante_id = e.id and c.estado in ('pendiente', 'parcial')
    ), 0) as pendiente,
    private.morosidad_bloquea(e.id) as bloqueado
  from public.estudiantes e
  left join public.matriculas m
    on m.estudiante_id = e.id and m.estado = 'activa'
  left join public.secciones s on s.id = m.seccion_id
  left join public.grados g on g.id = s.grado_id
  left join public.niveles nv on nv.id = g.nivel_id
  where e.id in (select private.mis_estudiantes())
  order by e.apellidos, e.nombres;
$$;
revoke all on function public.portal_estudiantes() from public, anon;
grant execute on function public.portal_estudiantes() to authenticated, service_role;

-- ── Portal: calificaciones (GATED por morosidad) ───────────────────────
create or replace function public.portal_calificaciones(p_est uuid)
returns table (asignatura text, promedio numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_est not in (select private.mis_estudiantes()) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  -- Bloqueo por morosidad: si aplica, no se devuelven calificaciones.
  if private.morosidad_bloquea(p_est) then
    return;
  end if;
  return query
    with notas as (
      select cc.asignatura_id, cc.periodo_id,
        sum(cc.valor * pc.peso / 100) as nota
      from public.calificacion_componentes cc
      join public.ponderacion_componentes pc on pc.id = cc.componente_id
      where cc.estudiante_id = p_est
      group by cc.asignatura_id, cc.periodo_id
    )
    select a.nombre, round(avg(n.nota), 2)
    from notas n
    join public.asignaturas a on a.id = n.asignatura_id
    group by a.nombre
    order by a.nombre;
end;
$$;
revoke all on function public.portal_calificaciones(uuid) from public, anon;
grant execute on function public.portal_calificaciones(uuid) to authenticated, service_role;

-- ── Portal: resumen de asistencia (informativo, no se bloquea) ─────────
create or replace function public.portal_asistencia(p_est uuid)
returns table (presente bigint, ausente bigint, tardanza bigint,
  excusa bigint, retiro bigint, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_est not in (select private.mis_estudiantes()) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      count(*) filter (where r.estado = 'presente'),
      count(*) filter (where r.estado = 'ausente'),
      count(*) filter (where r.estado = 'tardanza'),
      count(*) filter (where r.estado = 'excusa'),
      count(*) filter (where r.estado = 'retiro_anticipado'),
      count(*)
    from public.asistencia_registros r
    where r.estudiante_id = p_est;
end;
$$;
revoke all on function public.portal_asistencia(uuid) from public, anon;
grant execute on function public.portal_asistencia(uuid) to authenticated, service_role;

-- ── Portal: estado financiero (siempre visible: deben poder pagar) ─────
create or replace function public.portal_finanzas(p_est uuid)
returns table (
  concepto text, monto numeric, vencimiento date, estado text, vencido boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_est not in (select private.mis_estudiantes()) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select c.descripcion, c.monto, c.vencimiento, c.estado::text,
      (c.vencimiento is not null and c.vencimiento < current_date
        and c.estado in ('pendiente', 'parcial'))
    from public.cargos c
    where c.estudiante_id = p_est and c.estado <> 'anulado'
    order by c.vencimiento nulls last;
end;
$$;
revoke all on function public.portal_finanzas(uuid) from public, anon;
grant execute on function public.portal_finanzas(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  Semilla: cuentas demo del portal (tutor + estudiante) vinculadas a una
--  familia MOROSA, para poder demostrar el bloqueo. Best-effort: si el
--  esquema de auth no admite el insert directo, no aborta la migración.
-- ══════════════════════════════════════════════════════════════════════
do $$
declare
  v_fam uuid;
  v_tutor uuid;
  v_est uuid;
  v_uid_tutor uuid;
  v_uid_est uuid;
  v_instance uuid;
begin
  -- Familia morosa con tutor principal y al menos un estudiante activo.
  select f.id into v_fam
  from public.familias f
  where exists (
      select 1 from public.estudiantes e
      join public.estudiante_tutores et on et.estudiante_id = e.id
      where e.familia_id = f.id and e.estado = 'activo')
    and exists (
      select 1 from public.cargos c
      join public.estudiantes e on e.id = c.estudiante_id
      where e.familia_id = f.id and c.estado in ('pendiente', 'parcial')
        and c.vencimiento is not null and c.vencimiento < current_date)
  order by (
    select max(current_date - c.vencimiento)
    from public.cargos c join public.estudiantes e on e.id = c.estudiante_id
    where e.familia_id = f.id and c.vencimiento is not null
  ) desc nulls last
  limit 1;

  if v_fam is null then return; end if;

  select et.tutor_id into v_tutor
  from public.estudiante_tutores et
  join public.estudiantes e on e.id = et.estudiante_id
  where e.familia_id = v_fam
  order by et.principal desc
  limit 1;

  select e.id into v_est
  from public.estudiantes e
  where e.familia_id = v_fam and e.estado = 'activo'
  order by e.fecha_nacimiento
  limit 1;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid) into v_instance;

  -- ── Usuario TUTOR ─────────────────────────────────────────────────
  select id into v_uid_tutor from auth.users where email = 'familia.demo@jmescolar.do';
  if v_uid_tutor is null then
    v_uid_tutor := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data)
    values (
      v_instance, v_uid_tutor, 'authenticated', 'authenticated',
      'familia.demo@jmescolar.do',
      extensions.crypt('PortalFamilia2026', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nombre_completo":"Madre/Padre Demo"}'::jsonb);
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at)
    values (
      v_uid_tutor::text, v_uid_tutor,
      jsonb_build_object('sub', v_uid_tutor::text, 'email', 'familia.demo@jmescolar.do'),
      'email', now(), now(), now());
  end if;

  update public.profiles
    set role = 'tutor', status = 'activo', nombre_completo = 'Madre/Padre Demo'
    where id = v_uid_tutor;
  if v_tutor is not null then
    update public.tutores set profile_id = v_uid_tutor where id = v_tutor;
  end if;

  -- ── Usuario ESTUDIANTE ────────────────────────────────────────────
  select id into v_uid_est from auth.users where email = 'estudiante.demo@jmescolar.do';
  if v_uid_est is null then
    v_uid_est := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data)
    values (
      v_instance, v_uid_est, 'authenticated', 'authenticated',
      'estudiante.demo@jmescolar.do',
      extensions.crypt('PortalEstudiante2026', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nombre_completo":"Estudiante Demo"}'::jsonb);
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at)
    values (
      v_uid_est::text, v_uid_est,
      jsonb_build_object('sub', v_uid_est::text, 'email', 'estudiante.demo@jmescolar.do'),
      'email', now(), now(), now());
  end if;

  update public.profiles
    set role = 'estudiante', status = 'activo', nombre_completo = 'Estudiante Demo'
    where id = v_uid_est;
  if v_est is not null then
    update public.estudiantes set profile_id = v_uid_est where id = v_est;
  end if;

exception when others then
  raise notice 'Seed de cuentas demo omitido (auth no compatible): %', sqlerrm;
end $$;

commit;
