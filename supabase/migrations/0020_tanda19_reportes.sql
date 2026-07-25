-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 19 — Reportes y Dashboard de Dirección          ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  RPCs de agregación de solo lectura para el panel ejecutivo. Patrón   ║
-- ║  private (DEFINER, con guardia de rol) + wrapper public (INVOKER) →   ║
-- ║  Security Advisor limpio. Sin nuevas tablas.                          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── KPIs generales ──────────────────────────────────────────────────────
create or replace function private.dash_kpis()
returns table (
  estudiantes bigint, docentes bigint, cobrado numeric,
  pendiente numeric, familias_morosas bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.tiene_rol('director', 'coordinador', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      (select count(*) from public.estudiantes where estado = 'activo'),
      (select count(*) from public.empleados where estado = 'activo' and tipo = 'docente'),
      (select coalesce(sum(monto), 0) from public.cargos where estado = 'pagado'),
      (select coalesce(sum(monto), 0) from public.cargos where estado in ('pendiente', 'parcial')),
      (select count(*) from public.panel_morosidad());
end;
$$;
revoke all on function private.dash_kpis() from public, anon;
grant execute on function private.dash_kpis() to authenticated, service_role;

create or replace function public.dash_kpis()
returns table (
  estudiantes bigint, docentes bigint, cobrado numeric,
  pendiente numeric, familias_morosas bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.dash_kpis(); $$;
revoke all on function public.dash_kpis() from public, anon;
grant execute on function public.dash_kpis() to authenticated, service_role;

-- ── Matrícula por nivel ─────────────────────────────────────────────────
create or replace function private.dash_matricula_nivel()
returns table (nivel text, cantidad bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.tiene_rol('director', 'coordinador', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select nv.nombre, count(distinct e.id)
    from public.estudiantes e
    join public.matriculas m on m.estudiante_id = e.id and m.estado = 'activa'
    join public.secciones s on s.id = m.seccion_id
    join public.grados g on g.id = s.grado_id
    join public.niveles nv on nv.id = g.nivel_id
    where e.estado = 'activo'
    group by nv.nombre, nv.orden
    order by nv.orden;
end;
$$;
revoke all on function private.dash_matricula_nivel() from public, anon;
grant execute on function private.dash_matricula_nivel() to authenticated, service_role;

create or replace function public.dash_matricula_nivel()
returns table (nivel text, cantidad bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.dash_matricula_nivel(); $$;
revoke all on function public.dash_matricula_nivel() from public, anon;
grant execute on function public.dash_matricula_nivel() to authenticated, service_role;

-- ── Ingresos por mes (esperado vs cobrado) ─────────────────────────────
create or replace function private.dash_ingresos_mes()
returns table (mes int, esperado numeric, cobrado numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.tiene_rol('director', 'coordinador', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select c.mes,
      coalesce(sum(c.monto), 0),
      coalesce(sum(c.monto) filter (where c.estado = 'pagado'), 0)
    from public.cargos c
    where c.mes is not null and c.estado <> 'anulado'
    group by c.mes;
end;
$$;
revoke all on function private.dash_ingresos_mes() from public, anon;
grant execute on function private.dash_ingresos_mes() to authenticated, service_role;

create or replace function public.dash_ingresos_mes()
returns table (mes int, esperado numeric, cobrado numeric)
language sql stable security invoker set search_path = ''
as $$ select * from private.dash_ingresos_mes(); $$;
revoke all on function public.dash_ingresos_mes() from public, anon;
grant execute on function public.dash_ingresos_mes() to authenticated, service_role;

-- ── Antigüedad de morosidad (aging buckets) ────────────────────────────
create or replace function private.dash_morosidad_aging()
returns table (bucket text, monto numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.tiene_rol('director', 'coordinador', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    with p as (select * from public.panel_morosidad())
    select * from (values
      ('0–30',  (select coalesce(sum(b_0_30), 0) from p)),
      ('31–60', (select coalesce(sum(b_31_60), 0) from p)),
      ('61–90', (select coalesce(sum(b_61_90), 0) from p)),
      ('90+',   (select coalesce(sum(b_90mas), 0) from p))
    ) as t(bucket, monto);
end;
$$;
revoke all on function private.dash_morosidad_aging() from public, anon;
grant execute on function private.dash_morosidad_aging() to authenticated, service_role;

create or replace function public.dash_morosidad_aging()
returns table (bucket text, monto numeric)
language sql stable security invoker set search_path = ''
as $$ select * from private.dash_morosidad_aging(); $$;
revoke all on function public.dash_morosidad_aging() from public, anon;
grant execute on function public.dash_morosidad_aging() to authenticated, service_role;

-- ── Rendimiento académico por nivel ────────────────────────────────────
create or replace function private.dash_rendimiento_nivel()
returns table (nivel text, promedio numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.tiene_rol('director', 'coordinador', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    with notas as (
      select m.seccion_id, cc.estudiante_id, cc.asignatura_id, cc.periodo_id,
        sum(cc.valor * pc.peso / 100) as nota
      from public.calificacion_componentes cc
      join public.ponderacion_componentes pc on pc.id = cc.componente_id
      join public.matriculas m
        on m.estudiante_id = cc.estudiante_id and m.estado = 'activa'
      group by m.seccion_id, cc.estudiante_id, cc.asignatura_id, cc.periodo_id
    )
    select nv.nombre, round(avg(n.nota), 1)
    from notas n
    join public.secciones s on s.id = n.seccion_id
    join public.grados g on g.id = s.grado_id
    join public.niveles nv on nv.id = g.nivel_id
    group by nv.nombre, nv.orden
    order by nv.orden;
end;
$$;
revoke all on function private.dash_rendimiento_nivel() from public, anon;
grant execute on function private.dash_rendimiento_nivel() to authenticated, service_role;

create or replace function public.dash_rendimiento_nivel()
returns table (nivel text, promedio numeric)
language sql stable security invoker set search_path = ''
as $$ select * from private.dash_rendimiento_nivel(); $$;
revoke all on function public.dash_rendimiento_nivel() from public, anon;
grant execute on function public.dash_rendimiento_nivel() to authenticated, service_role;

commit;
