-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA B — Acta general (sábana), promedios y cuadro     ║
-- ║  de honor.  Bloque único. Aplicar vía Management API (PAT temporal).   ║
-- ║                                                                        ║
-- ║  Agregaciones de SOLO LECTURA construidas sobre el motor normativo    ║
-- ║  public.situacion_academica (Ord. 04-2023): promedios por asignatura, ║
-- ║  resumen por sección/grado/nivel y cuadro de honor rankeado. Sin      ║
-- ║  tablas nuevas. SECURITY INVOKER (igual que promedios_finales): la RLS ║
-- ║  de calificacion_componentes ya restringe; Advisor limpio.            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Promedio por asignatura de una sección (pie de la sábana) ───────────
create or replace function public.promedios_asignatura(p_anio uuid, p_seccion uuid)
returns table (
  asignatura_id uuid, promedio numeric, aprobados int, reprobados int)
language sql
stable
security invoker
set search_path = ''
as $$
  with mn as (
    select n.min_aprobacion as v_min
    from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    where s.id = p_seccion
  )
  select pf.asignatura_id,
    round(avg(pf.promedio), 2) as promedio,
    count(*) filter (where mn.v_min is null or pf.promedio >= mn.v_min)::int as aprobados,
    count(*) filter (where mn.v_min is not null and pf.promedio < mn.v_min)::int as reprobados
  from public.promedios_finales(p_anio, p_seccion) pf
  cross join mn
  group by pf.asignatura_id;
$$;
revoke all on function public.promedios_asignatura(uuid, uuid) from public, anon;
grant execute on function public.promedios_asignatura(uuid, uuid) to authenticated, service_role;

-- ── Cuadro de honor de una sección (rankeado) ───────────────────────────
-- Estudiantes promovidos, con asistencia en regla y promedio ≥ umbral.
create or replace function public.cuadro_honor(
  p_anio uuid, p_seccion uuid, p_umbral numeric default 90)
returns table (
  estudiante_id uuid, promedio_general numeric, asistencia numeric, puesto int)
language sql
stable
security invoker
set search_path = ''
as $$
  select sa.estudiante_id, sa.promedio_general, sa.asistencia,
    (rank() over (order by sa.promedio_general desc))::int as puesto
  from public.situacion_academica(p_anio, p_seccion) sa
  where sa.promedio_general is not null
    and sa.promedio_general >= p_umbral
    and sa.asistencia_ok
    and sa.situacion in ('promovido', 'promovido_automatico')
  order by sa.promedio_general desc;
$$;
revoke all on function public.cuadro_honor(uuid, uuid, numeric) from public, anon;
grant execute on function public.cuadro_honor(uuid, uuid, numeric) to authenticated, service_role;

-- ── Resumen de promedios por sección (rollup por grado/nivel en la UI) ──
create or replace function public.promedios_resumen(p_anio uuid)
returns table (
  seccion_id uuid, seccion text,
  grado text, grado_orden int,
  nivel text, nivel_orden int,
  estudiantes int, promedio_general numeric,
  promovidos int, completivo int, reprobados int,
  condicion_asistencia int)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, s.nombre,
    g.nombre, g.orden,
    n.nombre, n.orden,
    count(sa.estudiante_id)::int as estudiantes,
    round(avg(sa.promedio_general), 2) as promedio_general,
    count(*) filter (where sa.situacion in ('promovido', 'promovido_automatico'))::int,
    count(*) filter (where sa.situacion = 'completivo')::int,
    count(*) filter (where sa.situacion = 'reprobado')::int,
    count(*) filter (where sa.situacion = 'condicion_asistencia')::int
  from public.secciones s
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  left join lateral public.situacion_academica(p_anio, s.id) sa on true
  where s.anio_id = p_anio
  group by s.id, s.nombre, g.nombre, g.orden, n.nombre, n.orden
  order by n.orden, g.orden, s.nombre;
$$;
revoke all on function public.promedios_resumen(uuid) from public, anon;
grant execute on function public.promedios_resumen(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  SEMILLA — estudiantes de excelencia (cuadro de honor real en el demo)
--  La distribución aleatoria original deja a casi todos ~77; ningún colegio
--  es tan plano. Eleva el desempeño de los 2 mejores de cada sección para
--  que el cuadro de honor tenga sentido a umbrales reales (85/90).
--  Carga de sistema: abre el bypass de inmutabilidad sólo en esta migración.
-- ══════════════════════════════════════════════════════════════════════
do $$
declare v_anio uuid;
begin
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';
  if v_anio is null then return; end if;

  -- Idempotente: si ya hay honores (algún promedio ≥ 90), no repetir.
  if exists (
    select 1 from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    left join lateral public.situacion_academica(v_anio, s.id) sa on true
    where s.anio_id = v_anio and n.codigo in ('PRIMARIA', 'SECUNDARIA')
      and sa.promedio_general >= 90
    limit 1
  ) then
    return;
  end if;

  perform set_config('app.permitir_correccion', 'on', true);

  with ranked as (
    select sa.estudiante_id, s.id as seccion_id,
      row_number() over (
        partition by s.id order by sa.promedio_general desc nulls last
      ) as rn
    from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    left join lateral public.situacion_academica(v_anio, s.id) sa on true
    where s.anio_id = v_anio and n.codigo in ('PRIMARIA', 'SECUNDARIA')
      and sa.estudiante_id is not null
  )
  update public.calificacion_componentes cc
  set valor = (92 + abs(hashtext(cc.id::text)) % 7)::numeric  -- 92..98
  from ranked r
  where r.rn <= 2
    and cc.estudiante_id = r.estudiante_id
    and cc.seccion_id = r.seccion_id;

  perform set_config('app.permitir_correccion', 'off', true);
end $$;

commit;
