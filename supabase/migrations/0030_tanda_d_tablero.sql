-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA D — Tablero por módulo (KPIs animados)            ║
-- ║  Bloque único. Aplicar vía Management API (PAT temporal).             ║
-- ║                                                                        ║
-- ║  KPIs académicos y operativos en una sola llamada, para el panel con  ║
-- ║  contadores animados (CountUp) por módulo. Patrón private (DEFINER,   ║
-- ║  guardia de rol) + wrapper public (INVOKER). Los KPIs financieros ya  ║
-- ║  existen (public.dash_kpis, restringido a dirección/contabilidad).     ║
-- ║  Sin tablas nuevas.                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

create or replace function private.tablero_kpis(p_anio uuid)
returns table (
  estudiantes_activos bigint,
  docentes_activos bigint,
  empleados_activos bigint,
  promedio_general numeric,
  pct_asistencia numeric,
  riesgo_asistencia bigint,
  prestamos_activos bigint,
  circulares_mes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.tiene_rol('director', 'coordinador', 'secretaria') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
  select
    (select count(*) from public.estudiantes where estado = 'activo'),
    (select count(*) from public.empleados where estado = 'activo' and tipo = 'docente'),
    (select count(*) from public.empleados where estado = 'activo'),
    (select round(avg(pr.promedio_general), 1)
       from public.promedios_resumen(p_anio) pr
       where pr.promedio_general is not null),
    (select d.pct_global from public.asistencia_dashboard(p_anio) d),
    (select d.estudiantes_riesgo from public.asistencia_dashboard(p_anio) d),
    (select count(*) from public.prestamos where devuelto_at is null),
    (select count(*) from public.circulares
       where publicada
         and date_trunc('month', publicada_at) = date_trunc('month', now()));
end;
$$;
revoke all on function private.tablero_kpis(uuid) from public, anon;
grant execute on function private.tablero_kpis(uuid) to authenticated, service_role;

create or replace function public.tablero_kpis(p_anio uuid)
returns table (
  estudiantes_activos bigint,
  docentes_activos bigint,
  empleados_activos bigint,
  promedio_general numeric,
  pct_asistencia numeric,
  riesgo_asistencia bigint,
  prestamos_activos bigint,
  circulares_mes bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.tablero_kpis(p_anio); $$;
revoke all on function public.tablero_kpis(uuid) from public, anon;
grant execute on function public.tablero_kpis(uuid) to authenticated, service_role;

commit;
