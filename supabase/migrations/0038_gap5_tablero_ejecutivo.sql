-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · GAP 5 — Tablero ejecutivo (mirador de dirección)        ║
-- ║  Aplicar vía Management API (PAT temporal).                          ║
-- ║                                                                        ║
-- ║  Consolida en una sola llamada la salud institucional (matrícula,     ║
-- ║  ocupación, cobro del mes, morosidad, asistencia, rendimiento y       ║
-- ║  admisiones) y genera ALERTAS EJECUTIVAS priorizadas (semáforos).     ║
-- ║  Solo analítica — sin tablas nuevas. Patrón private DEFINER (guardia  ║
-- ║  de rol) + wrapper public INVOKER, para Advisor limpio.               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Salud institucional consolidada ─────────────────────────────────────
create or replace function private.tablero_ejecutivo(p_anio uuid)
returns table (
  estudiantes_activos    int,
  docentes_activos       int,
  cupo_total             int,
  ocupacion_pct          numeric,
  esperado_mes           numeric,
  cobrado_mes            numeric,
  tasa_cobro_mes         numeric,
  morosidad_saldo        numeric,
  familias_morosas       int,
  familias_total         int,
  deuda_90mas            numeric,
  asistencia_pct         numeric,
  riesgo_asistencia      int,
  promedio_general       numeric,
  admisiones_pendientes  int,
  admisiones_aceptadas   int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_mes  int := extract(month from current_date)::int;
  v_esp  numeric;
  v_cob  numeric;
begin
  if not private.tiene_rol('director', 'coordinador') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(sum(monto), 0),
         coalesce(sum(monto) filter (where estado = 'pagado'), 0)
    into v_esp, v_cob
  from public.cargos
  where mes = v_mes and estado <> 'anulado';

  return query
  select
    (select count(*)::int from public.estudiantes where estado = 'activo'),
    (select count(*)::int from public.empleados
       where estado = 'activo' and tipo = 'docente'),
    (select coalesce(sum(s.cupo), 0)::int
       from public.secciones s
       where s.anio_id = p_anio and s.activa),
    (select case when coalesce(sum(s.cupo), 0) > 0 then
        round(
          (select count(*) from public.estudiantes where estado = 'activo')::numeric
          * 100 / sum(s.cupo), 1)
        else 0 end
       from public.secciones s where s.anio_id = p_anio and s.activa),
    v_esp,
    v_cob,
    case when v_esp > 0 then round(v_cob * 100 / v_esp, 1) else 0 end,
    (select coalesce(sum(saldo), 0) from public.panel_morosidad()),
    (select count(*)::int from public.panel_morosidad()),
    (select count(distinct f.id)::int from public.familias f),
    (select coalesce(sum(b_90mas), 0) from public.panel_morosidad()),
    (select coalesce(d.pct_global, 0) from public.asistencia_dashboard(p_anio) d),
    (select coalesce(d.estudiantes_riesgo, 0)::int
       from public.asistencia_dashboard(p_anio) d),
    (select round(avg(pr.promedio_general), 1)
       from public.promedios_resumen(p_anio) pr
       where pr.promedio_general is not null),
    (select count(*)::int from public.solicitudes_admision
       where estado in ('recibida', 'en_revision', 'entrevista')),
    (select count(*)::int from public.solicitudes_admision
       where estado = 'aceptada');
end;
$$;
revoke all on function private.tablero_ejecutivo(uuid) from public, anon;
grant execute on function private.tablero_ejecutivo(uuid) to authenticated, service_role;

create or replace function public.tablero_ejecutivo(p_anio uuid)
returns table (
  estudiantes_activos    int,
  docentes_activos       int,
  cupo_total             int,
  ocupacion_pct          numeric,
  esperado_mes           numeric,
  cobrado_mes            numeric,
  tasa_cobro_mes         numeric,
  morosidad_saldo        numeric,
  familias_morosas       int,
  familias_total         int,
  deuda_90mas            numeric,
  asistencia_pct         numeric,
  riesgo_asistencia      int,
  promedio_general       numeric,
  admisiones_pendientes  int,
  admisiones_aceptadas   int)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.tablero_ejecutivo(p_anio); $$;
revoke all on function public.tablero_ejecutivo(uuid) from public, anon;
grant execute on function public.tablero_ejecutivo(uuid) to authenticated, service_role;

-- ── Alertas ejecutivas priorizadas (semáforos) ──────────────────────────
create or replace function private.alertas_ejecutivas(p_anio uuid)
returns table (
  severidad text, categoria text, titulo text, detalle text, orden int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare m record;
begin
  if not private.tiene_rol('director', 'coordinador') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;

  select * into m from private.tablero_ejecutivo(p_anio);

  return query
  select t.severidad, t.categoria, t.titulo, t.detalle, t.orden
  from (values
    ('alta', 'Finanzas', 'Cartera vencida +90 días',
     'RD$ ' || trim(to_char(coalesce(m.deuda_90mas, 0), 'FM999,999,990'))
       || ' con más de 90 días de mora',
     1, coalesce(m.deuda_90mas, 0) > 0),
    ('alta', 'Finanzas', 'Morosidad elevada',
     m.familias_morosas || ' de ' || greatest(m.familias_total, 1)
       || ' familias con saldo vencido',
     2, m.familias_total > 0
        and m.familias_morosas::numeric / m.familias_total > 0.20),
    ('media', 'Finanzas', 'Cobro del mes bajo la meta',
     'Tasa de cobro del mes en ' || coalesce(m.tasa_cobro_mes, 0) || '%',
     3, m.esperado_mes > 0 and coalesce(m.tasa_cobro_mes, 0) < 70),
    ('media', 'Académico', 'Asistencia por debajo del umbral',
     'Asistencia global en ' || coalesce(m.asistencia_pct, 0) || '%',
     4, m.asistencia_pct is not null and m.asistencia_pct < 90),
    ('media', 'Académico', 'Estudiantes en riesgo por inasistencia',
     m.riesgo_asistencia || ' estudiante(s) bajo 80% de asistencia',
     5, coalesce(m.riesgo_asistencia, 0) > 0),
    ('media', 'Admisiones', 'Aspirantes aceptados sin matricular',
     m.admisiones_aceptadas || ' solicitud(es) aceptada(s) pendiente(s) de matrícula',
     6, coalesce(m.admisiones_aceptadas, 0) > 0),
    ('media', 'Operación', 'Cupo casi lleno',
     'Ocupación de plazas en ' || coalesce(m.ocupacion_pct, 0) || '%',
     7, coalesce(m.ocupacion_pct, 0) >= 95),
    ('baja', 'Admisiones', 'Solicitudes por revisar',
     m.admisiones_pendientes || ' solicitud(es) de admisión en proceso',
     8, coalesce(m.admisiones_pendientes, 0) > 0)
  ) as t(severidad, categoria, titulo, detalle, orden, incluir)
  where t.incluir
  order by t.orden;
end;
$$;
revoke all on function private.alertas_ejecutivas(uuid) from public, anon;
grant execute on function private.alertas_ejecutivas(uuid) to authenticated, service_role;

create or replace function public.alertas_ejecutivas(p_anio uuid)
returns table (
  severidad text, categoria text, titulo text, detalle text, orden int)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.alertas_ejecutivas(p_anio); $$;
revoke all on function public.alertas_ejecutivas(uuid) from public, anon;
grant execute on function public.alertas_ejecutivas(uuid) to authenticated, service_role;

commit;
