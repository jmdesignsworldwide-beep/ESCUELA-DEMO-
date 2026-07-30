-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · CORRECCIÓN NORMATIVA (Ordenanza 04-2023 MINERD)        ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Nota mínima de aprobación POR NIVEL (Primaria 65 / Secundaria 70),   ║
-- ║  1º y 2º de Primaria sin repitencia, y regla de 80% de asistencia.    ║
-- ║  Todo configurable. Corrige el motor de promoción/aprobación.        ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Nota de aprobación por nivel (configurable) ────────────────────────
alter table public.niveles
  add column if not exists min_aprobacion numeric(5,2);

-- Seed según Ordenanza 04-2023: Primaria 65, Secundaria 70, Inicial NULL.
update public.niveles set min_aprobacion = 65
  where min_aprobacion is null and (nombre ilike '%primar%' or codigo ilike '%pri%');
update public.niveles set min_aprobacion = 70
  where min_aprobacion is null and (nombre ilike '%secund%' or codigo ilike '%sec%');
-- Inicial permanece NULL (evaluación cualitativa).

-- ── Repitencia por grado (1º y 2º de Primaria: no aplica) ──────────────
alter table public.grados
  add column if not exists permite_repitencia boolean not null default true;

-- 1º y 2º de Primaria (orden 1 y 2 dentro del nivel Primaria) no repiten.
update public.grados g
  set permite_repitencia = false
  from public.niveles n
  where g.nivel_id = n.id
    and (n.nombre ilike '%primar%' or n.codigo ilike '%pri%')
    and g.orden in (1, 2);

-- ── Configuración académica (regla de asistencia, por sede) ────────────
create table if not exists public.config_academica (
  id                uuid primary key default gen_random_uuid(),
  sede_id           uuid not null unique references public.sedes(id) on delete cascade,
  asistencia_minima numeric(5,2) not null default 80,
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_config_acad_updated_at on public.config_academica;
create trigger trg_config_acad_updated_at
  before update on public.config_academica
  for each row execute function public.set_updated_at();

insert into public.config_academica (sede_id)
select id from public.sedes on conflict (sede_id) do nothing;

alter table public.config_academica enable row level security;
alter table public.config_academica force row level security;
drop policy if exists config_acad_select on public.config_academica;
create policy config_acad_select on public.config_academica
  for select to authenticated using (true);
drop policy if exists config_acad_write on public.config_academica;
create policy config_acad_write on public.config_academica
  for all to authenticated
  using (private.tiene_rol('director'))
  with check (private.tiene_rol('director'));

-- ── Porcentaje de asistencia por estudiante en el año ──────────────────
create or replace function public.asistencia_pct(p_est uuid, p_anio uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select case when count(*) = 0 then 100
    else round(
      100.0 * count(*) filter (where r.estado in ('presente', 'tardanza', 'excusa'))
      / count(*), 1) end
  from public.asistencia_registros r
  join public.asistencia_sesiones s on s.id = r.sesion_id
  where r.estudiante_id = p_est and s.anio_id = p_anio;
$$;
revoke all on function public.asistencia_pct(uuid, uuid) from public, anon;
grant execute on function public.asistencia_pct(uuid, uuid) to authenticated, service_role;

-- ── Situación académica por estudiante (motor de promoción MINERD) ─────
-- Aplica: umbral por nivel, 1º-2º sin repitencia, regla de 80% asistencia.
create or replace function public.situacion_academica(p_anio uuid, p_seccion uuid)
returns table (
  estudiante_id uuid, promedio_general numeric, reprobadas int,
  asistencia numeric, asistencia_ok boolean, situacion text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_min numeric; v_permite_rep boolean; v_asis_min numeric;
begin
  select n.min_aprobacion, g.permite_repitencia
    into v_min, v_permite_rep
  from public.secciones s
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  where s.id = p_seccion;

  select asistencia_minima into v_asis_min
  from public.config_academica limit 1;
  v_asis_min := coalesce(v_asis_min, 80);
  -- Inicial (sin umbral numérico): todos "en evaluación cualitativa".
  if v_min is null then
    return query
      select m.estudiante_id, null::numeric, 0,
        public.asistencia_pct(m.estudiante_id, p_anio),
        public.asistencia_pct(m.estudiante_id, p_anio) >= v_asis_min,
        'evaluacion_cualitativa'::text
      from public.matriculas m
      where m.seccion_id = p_seccion and m.anio_id = p_anio and m.estado = 'activa';
    return;
  end if;

  return query
  with prom as (
    select pf.estudiante_id,
      round(avg(pf.promedio), 2) as promedio_general,
      count(*) filter (where pf.promedio < v_min)::int as reprobadas
    from public.promedios_finales(p_anio, p_seccion) pf
    group by pf.estudiante_id
  )
  select m.estudiante_id,
    p.promedio_general,
    coalesce(p.reprobadas, 0),
    public.asistencia_pct(m.estudiante_id, p_anio) as asis,
    public.asistencia_pct(m.estudiante_id, p_anio) >= v_asis_min as asis_ok,
    (case
      when public.asistencia_pct(m.estudiante_id, p_anio) < v_asis_min
        then 'condicion_asistencia'
      when coalesce(p.reprobadas, 0) = 0 then 'promovido'
      when coalesce(p.reprobadas, 0) <= 2 then 'completivo'
      when not v_permite_rep then 'promovido_automatico'
      else 'reprobado'
    end)::text as situacion
  from public.matriculas m
  left join prom p on p.estudiante_id = m.estudiante_id
  where m.seccion_id = p_seccion and m.anio_id = p_anio and m.estado = 'activa';
end;
$$;
revoke all on function public.situacion_academica(uuid, uuid) from public, anon;
grant execute on function public.situacion_academica(uuid, uuid) to authenticated, service_role;

commit;
