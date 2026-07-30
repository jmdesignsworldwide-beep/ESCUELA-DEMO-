-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA C — Asistencia profesional + visible a padres    ║
-- ║  Bloque único. Aplicar vía Management API (PAT temporal).             ║
-- ║                                                                        ║
-- ║  Analítica de asistencia: % mensual / por período / anual, semáforo   ║
-- ║  (verde ≥ mínimo / rojo < mínimo, config_academica.asistencia_minima),║
-- ║  resumen por sección, dashboard y tendencia. RPCs de portal para la   ║
-- ║  familia (DEFINER + wrapper INVOKER, con guardia mis_estudiantes).    ║
-- ║  Sin tablas nuevas. Semilla del año completo (P1→P3) para que las      ║
-- ║  vistas mensuales/por período tengan sentido.                         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ══════════════════════════════════════════════════════════════════════
--  STAFF (SECURITY INVOKER — la RLS de asistencia ya restringe)
-- ══════════════════════════════════════════════════════════════════════

-- Resumen por estudiante de una sección: días, presentes, %, semáforo.
create or replace function public.asistencia_seccion_resumen(
  p_anio uuid, p_seccion uuid)
returns table (
  estudiante_id uuid, dias bigint, presentes bigint, ausencias bigint,
  tardanzas bigint, pct numeric, en_riesgo boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select coalesce((select asistencia_minima from public.config_academica limit 1), 80) as min
  )
  select m.estudiante_id,
    count(r.id) as dias,
    count(*) filter (where r.estado in ('presente','tardanza','excusa')) as presentes,
    count(*) filter (where r.estado in ('ausente','retiro_anticipado')) as ausencias,
    count(*) filter (where r.estado = 'tardanza') as tardanzas,
    case when count(r.id) = 0 then 100
      else round(100.0 * count(*) filter (where r.estado in ('presente','tardanza','excusa'))
        / count(r.id), 1) end as pct,
    (case when count(r.id) = 0 then false
      else round(100.0 * count(*) filter (where r.estado in ('presente','tardanza','excusa'))
        / count(r.id), 1) < (select min from cfg) end) as en_riesgo
  from public.matriculas m
  left join public.asistencia_sesiones s
    on s.seccion_id = m.seccion_id and s.anio_id = p_anio
  left join public.asistencia_registros r
    on r.sesion_id = s.id and r.estudiante_id = m.estudiante_id
  where m.seccion_id = p_seccion and m.anio_id = p_anio and m.estado = 'activa'
  group by m.estudiante_id;
$$;
revoke all on function public.asistencia_seccion_resumen(uuid, uuid) from public, anon;
grant execute on function public.asistencia_seccion_resumen(uuid, uuid) to authenticated, service_role;

-- Dashboard: KPIs globales.
create or replace function public.asistencia_dashboard(p_anio uuid)
returns table (
  registros bigint, pct_global numeric,
  estudiantes_total bigint, estudiantes_riesgo bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select coalesce((select asistencia_minima from public.config_academica limit 1), 80) as min
  ),
  base as (
    select r.estado
    from public.asistencia_registros r
    join public.asistencia_sesiones s on s.id = r.sesion_id
    where s.anio_id = p_anio
  ),
  por_est as (
    select m.estudiante_id,
      public.asistencia_pct(m.estudiante_id, p_anio) as pct
    from public.matriculas m
    where m.anio_id = p_anio and m.estado = 'activa'
    group by m.estudiante_id
  )
  select
    (select count(*) from base),
    (select case when count(*) = 0 then 100
      else round(100.0 * count(*) filter (where estado in ('presente','tardanza','excusa'))
        / count(*), 1) end from base),
    (select count(*) from por_est),
    (select count(*) from por_est, cfg where por_est.pct < cfg.min);
$$;
revoke all on function public.asistencia_dashboard(uuid) from public, anon;
grant execute on function public.asistencia_dashboard(uuid) to authenticated, service_role;

-- Tendencia mensual global.
create or replace function public.asistencia_tendencia(p_anio uuid)
returns table (anio_cal int, mes int, pct numeric, registros bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select extract(year from s.fecha)::int, extract(month from s.fecha)::int,
    case when count(*) = 0 then 100
      else round(100.0 * count(*) filter (where r.estado in ('presente','tardanza','excusa'))
        / count(*), 1) end,
    count(*)
  from public.asistencia_registros r
  join public.asistencia_sesiones s on s.id = r.sesion_id
  where s.anio_id = p_anio
  group by 1, 2
  order by 1, 2;
$$;
revoke all on function public.asistencia_tendencia(uuid) from public, anon;
grant execute on function public.asistencia_tendencia(uuid) to authenticated, service_role;

-- Asistencia por nivel.
create or replace function public.asistencia_por_nivel(p_anio uuid)
returns table (nivel text, nivel_orden int, pct numeric, registros bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select nv.nombre, nv.orden,
    case when count(*) = 0 then 100
      else round(100.0 * count(*) filter (where r.estado in ('presente','tardanza','excusa'))
        / count(*), 1) end,
    count(*)
  from public.asistencia_registros r
  join public.asistencia_sesiones s on s.id = r.sesion_id
  join public.secciones sec on sec.id = s.seccion_id
  join public.grados g on g.id = sec.grado_id
  join public.niveles nv on nv.id = g.nivel_id
  where s.anio_id = p_anio
  group by nv.nombre, nv.orden
  order by nv.orden;
$$;
revoke all on function public.asistencia_por_nivel(uuid) from public, anon;
grant execute on function public.asistencia_por_nivel(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  PORTAL (DEFINER + wrapper INVOKER, guardia mis_estudiantes)
-- ══════════════════════════════════════════════════════════════════════

-- % anual del estudiante (para el semáforo del portal).
create or replace function private.portal_asistencia_pct(p_est uuid, p_anio uuid)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_est not in (select private.mis_estudiantes()) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return public.asistencia_pct(p_est, p_anio);
end;
$$;
revoke all on function private.portal_asistencia_pct(uuid, uuid) from public, anon;
grant execute on function private.portal_asistencia_pct(uuid, uuid) to authenticated, service_role;

create or replace function public.portal_asistencia_pct(p_est uuid, p_anio uuid)
returns numeric language sql stable security invoker set search_path = ''
as $$ select private.portal_asistencia_pct(p_est, p_anio); $$;
revoke all on function public.portal_asistencia_pct(uuid, uuid) from public, anon;
grant execute on function public.portal_asistencia_pct(uuid, uuid) to authenticated, service_role;

-- Asistencia mensual del estudiante.
create or replace function private.portal_asistencia_mensual(p_est uuid, p_anio uuid)
returns table (anio_cal int, mes int, presentes bigint, ausencias bigint, pct numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_est not in (select private.mis_estudiantes()) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select extract(year from s.fecha)::int, extract(month from s.fecha)::int,
      count(*) filter (where r.estado in ('presente','tardanza','excusa')),
      count(*) filter (where r.estado in ('ausente','retiro_anticipado')),
      case when count(*) = 0 then 100
        else round(100.0 * count(*) filter (where r.estado in ('presente','tardanza','excusa'))
          / count(*), 1) end
    from public.asistencia_registros r
    join public.asistencia_sesiones s on s.id = r.sesion_id
    where r.estudiante_id = p_est and s.anio_id = p_anio
    group by 1, 2
    order by 1, 2;
end;
$$;
revoke all on function private.portal_asistencia_mensual(uuid, uuid) from public, anon;
grant execute on function private.portal_asistencia_mensual(uuid, uuid) to authenticated, service_role;

create or replace function public.portal_asistencia_mensual(p_est uuid, p_anio uuid)
returns table (anio_cal int, mes int, presentes bigint, ausencias bigint, pct numeric)
language sql stable security invoker set search_path = ''
as $$ select * from private.portal_asistencia_mensual(p_est, p_anio); $$;
revoke all on function public.portal_asistencia_mensual(uuid, uuid) from public, anon;
grant execute on function public.portal_asistencia_mensual(uuid, uuid) to authenticated, service_role;

-- Asistencia por período del estudiante.
create or replace function private.portal_asistencia_periodo(p_est uuid, p_anio uuid)
returns table (orden int, nombre text, pct numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_est not in (select private.mis_estudiantes()) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select p.orden, p.nombre,
      case when count(r.id) = 0 then 100
        else round(100.0 * count(*) filter (where r.estado in ('presente','tardanza','excusa'))
          / count(r.id), 1) end
    from public.periodos p
    left join public.asistencia_sesiones s
      on s.anio_id = p.anio_id and s.fecha between p.fecha_inicio and p.fecha_fin
    left join public.asistencia_registros r
      on r.sesion_id = s.id and r.estudiante_id = p_est
    where p.anio_id = p_anio
    group by p.orden, p.nombre
    order by p.orden;
end;
$$;
revoke all on function private.portal_asistencia_periodo(uuid, uuid) from public, anon;
grant execute on function private.portal_asistencia_periodo(uuid, uuid) to authenticated, service_role;

create or replace function public.portal_asistencia_periodo(p_est uuid, p_anio uuid)
returns table (orden int, nombre text, pct numeric)
language sql stable security invoker set search_path = ''
as $$ select * from private.portal_asistencia_periodo(p_est, p_anio); $$;
revoke all on function public.portal_asistencia_periodo(uuid, uuid) from public, anon;
grant execute on function public.portal_asistencia_periodo(uuid, uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  SEMILLA — asistencia del año completo (P1→P2, ago 2025 → feb 2026)
--  Martes y jueves. ~10% de estudiantes con ausentismo alto (semáforo
--  rojo). Sesiones abiertas → registros → cerrar (respeta inmutabilidad).
-- ══════════════════════════════════════════════════════════════════════
do $$
declare v_anio uuid;
begin
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';
  if v_anio is null then return; end if;

  -- Idempotente: si ya hay asistencia previa a marzo, no repetir.
  if exists (
    select 1 from public.asistencia_sesiones
    where anio_id = v_anio and fecha < date '2026-03-01'
  ) then
    return;
  end if;

  -- 1) Sesiones (abiertas) martes/jueves de ago-18 a feb-27.
  insert into public.asistencia_sesiones (anio_id, seccion_id, empleado_id, fecha, cerrada)
  select v_anio, s.id, null, d::date, false
  from public.secciones s
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  cross join generate_series(date '2025-08-18', date '2026-02-27', interval '1 day') d
  where s.anio_id = v_anio and n.codigo in ('PRIMARIA', 'SECUNDARIA')
    and extract(dow from d) in (2, 4);

  -- 2) Registros por estudiante activo (estado determinista).
  insert into public.asistencia_registros (sesion_id, estudiante_id, estado)
  select ses.id, m.estudiante_id,
    (case
       when abs(hashtext(m.estudiante_id::text)) % 10 = 0 then  -- ~10% ausentistas
         (case
            when abs(hashtext(ses.id::text || m.estudiante_id::text)) % 100 < 35 then 'ausente'
            when abs(hashtext(ses.id::text || m.estudiante_id::text)) % 100 < 45 then 'tardanza'
            else 'presente' end)
       else
         (case
            when abs(hashtext(ses.id::text || m.estudiante_id::text)) % 100 < 5 then 'ausente'
            when abs(hashtext(ses.id::text || m.estudiante_id::text)) % 100 < 9 then 'tardanza'
            when abs(hashtext(ses.id::text || m.estudiante_id::text)) % 100 < 11 then 'excusa'
            else 'presente' end)
     end)::public.estado_asistencia
  from public.asistencia_sesiones ses
  join public.matriculas m
    on m.seccion_id = ses.seccion_id and m.anio_id = v_anio and m.estado = 'activa'
  where ses.anio_id = v_anio and ses.fecha < date '2026-03-01' and ses.cerrada = false
  on conflict (sesion_id, estudiante_id) do nothing;

  -- 3) Cerrar las sesiones de períodos ya cerrados (P1 y P2: antes de P3).
  update public.asistencia_sesiones
  set cerrada = true, cerrada_at = now()
  where anio_id = v_anio and fecha < date '2026-01-26';
end $$;

commit;
