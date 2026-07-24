-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 10 — Recuperación (Completivo/Extraordinario/     ║
-- ║  Especial)                                                            ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Notas de recuperación con TOPE 70. Cálculo de promoción/repitencia   ║
-- ║  (3+ reprobadas repite; 1–2 condicionado). RLS + FORCE.               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'instancia_recuperacion') then
    create type public.instancia_recuperacion as enum
      ('completivo', 'extraordinario', 'especial');
  end if;
end $$;

create table if not exists public.recuperaciones (
  id            uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  asignatura_id uuid not null references public.asignaturas(id) on delete cascade,
  anio_id       uuid not null references public.anios_escolares(id) on delete cascade,
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  instancia     public.instancia_recuperacion not null,
  nota          numeric(5,2) not null check (nota >= 0 and nota <= 70),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (estudiante_id, asignatura_id, anio_id, instancia)
);

create index if not exists idx_recup_est on public.recuperaciones(estudiante_id, anio_id);
create index if not exists idx_recup_sec on public.recuperaciones(seccion_id, anio_id);

drop trigger if exists trg_recup_updated_at on public.recuperaciones;
create trigger trg_recup_updated_at
  before update on public.recuperaciones
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.recuperaciones enable row level security;
alter table public.recuperaciones force row level security;

drop policy if exists recup_select on public.recuperaciones;
create policy recup_select on public.recuperaciones
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists recup_write on public.recuperaciones;
create policy recup_write on public.recuperaciones
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

-- ── RPC: promedio final por asignatura de una sección ──────────────────
create or replace function public.promedios_finales(p_anio uuid, p_seccion uuid)
returns table (estudiante_id uuid, asignatura_id uuid, promedio numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with periodo_notas as (
    select cc.estudiante_id, cc.asignatura_id, cc.periodo_id,
      sum(cc.valor * pc.peso / 100) as nota
    from public.calificacion_componentes cc
    join public.ponderacion_componentes pc on pc.id = cc.componente_id
    join public.periodos per on per.id = cc.periodo_id
    join public.matriculas m
      on m.estudiante_id = cc.estudiante_id and m.anio_id = per.anio_id
      and m.estado = 'activa'
    where per.anio_id = p_anio and m.seccion_id = p_seccion
    group by cc.estudiante_id, cc.asignatura_id, cc.periodo_id
  )
  select estudiante_id, asignatura_id, round(avg(nota), 2) as promedio
  from periodo_notas
  group by estudiante_id, asignatura_id;
$$;
revoke all on function public.promedios_finales(uuid, uuid) from public, anon;
grant execute on function public.promedios_finales(uuid, uuid) to authenticated, service_role;

-- ── Semilla: casos de recuperación (completivo) ─────────────────────────
do $$
declare v_anio uuid;
begin
  if exists (select 1 from public.recuperaciones limit 1) then
    return;
  end if;
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  insert into public.recuperaciones
    (estudiante_id, asignatura_id, anio_id, seccion_id, instancia, nota)
  select t.estudiante_id, t.asignatura_id, v_anio, t.seccion_id, 'completivo',
    (case when (row_number() over ()) % 2 = 0 then 70 else 63 end)::numeric
  from (
    with periodo_notas as (
      select cc.estudiante_id, cc.asignatura_id, m.seccion_id, cc.periodo_id,
        sum(cc.valor * pc.peso / 100) as nota
      from public.calificacion_componentes cc
      join public.ponderacion_componentes pc on pc.id = cc.componente_id
      join public.periodos per on per.id = cc.periodo_id
      join public.matriculas m
        on m.estudiante_id = cc.estudiante_id and m.anio_id = per.anio_id
        and m.estado = 'activa'
      where per.anio_id = v_anio
      group by cc.estudiante_id, cc.asignatura_id, m.seccion_id, cc.periodo_id
    )
    select estudiante_id, asignatura_id, seccion_id,
      round(avg(nota), 2) as promedio
    from periodo_notas
    group by estudiante_id, asignatura_id, seccion_id
    having round(avg(nota), 2) >= 50 and round(avg(nota), 2) < 70
    limit 40
  ) t
  on conflict do nothing;
end $$;

commit;
