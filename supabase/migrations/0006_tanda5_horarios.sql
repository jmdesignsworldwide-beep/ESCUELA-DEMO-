-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 5 — Horarios                                     ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Bloques de horario por sección con DETECCIÓN DE CONFLICTOS a nivel   ║
-- ║  de base de datos: un docente no puede estar en dos lugares a la vez, ║
-- ║  ni un aula ni una sección pueden solaparse. Enforzado con            ║
-- ║  constraints EXCLUDE (btree_gist). Semilla conflict-free.            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

set local search_path = public, extensions;

create extension if not exists btree_gist with schema extensions;

-- ── Tabla ───────────────────────────────────────────────────────────────
create table if not exists public.horarios (
  id            uuid primary key default gen_random_uuid(),
  anio_id       uuid not null references public.anios_escolares(id) on delete cascade,
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  asignatura_id uuid not null references public.asignaturas(id) on delete cascade,
  empleado_id   uuid not null references public.empleados(id) on delete cascade,
  aula_id       uuid references public.aulas(id) on delete set null,
  dia_semana    smallint not null check (dia_semana between 1 and 5),
  hora_inicio   time not null,
  hora_fin      time not null,
  created_at    timestamptz not null default now(),
  constraint horario_rango_valido check (hora_fin > hora_inicio),
  rango int4range generated always as (
    int4range(
      (extract(hour from hora_inicio) * 60 + extract(minute from hora_inicio))::int,
      (extract(hour from hora_fin) * 60 + extract(minute from hora_fin))::int
    )
  ) stored
);

-- ── Detección de conflictos (EXCLUDE con gist) ─────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ex_horario_docente') then
    alter table public.horarios add constraint ex_horario_docente
      exclude using gist (
        empleado_id with =, anio_id with =, dia_semana with =, rango with &&);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ex_horario_aula') then
    alter table public.horarios add constraint ex_horario_aula
      exclude using gist (
        aula_id with =, anio_id with =, dia_semana with =, rango with &&);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ex_horario_seccion') then
    alter table public.horarios add constraint ex_horario_seccion
      exclude using gist (
        seccion_id with =, anio_id with =, dia_semana with =, rango with &&);
  end if;
end $$;

create index if not exists idx_horarios_seccion on public.horarios(seccion_id);
create index if not exists idx_horarios_empleado on public.horarios(empleado_id);
create index if not exists idx_horarios_aula on public.horarios(aula_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.horarios enable row level security;
alter table public.horarios force row level security;

drop policy if exists horarios_select on public.horarios;
create policy horarios_select on public.horarios
  for select to authenticated using (private.es_activo());

drop policy if exists horarios_write on public.horarios;
create policy horarios_write on public.horarios
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

-- ── Semilla: horario conflict-free (greedy con manejo de excepción) ─────
do $$
declare
  v_anio uuid;
  v_sede uuid;
  ini time[] := array['08:00','08:45','09:30','10:30','11:15','12:00']::time[];
  fin time[] := array['08:45','09:30','10:15','11:15','12:00','12:45']::time[];
  aulas_arr uuid[];
  rec_sec record;
  rec_asig record;
  sec_idx int := 0;
  v_aula uuid;
  placed int;
  p int;
  d int;
begin
  if exists (select 1 from public.horarios limit 1) then
    return;
  end if;

  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  select array_agg(id order by codigo) into aulas_arr
  from public.aulas where sede_id = v_sede;

  for rec_sec in
    select s.id
    from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    where s.anio_id = v_anio and n.codigo in ('PRIMARIA', 'SECUNDARIA')
    order by n.orden, g.orden, s.nombre
  loop
    sec_idx := sec_idx + 1;
    v_aula := aulas_arr[1 + (sec_idx - 1) % array_length(aulas_arr, 1)];
    update public.secciones set aula_id = v_aula where id = rec_sec.id;

    for rec_asig in
      select empleado_id, asignatura_id, horas_semanales
      from public.docente_secciones
      where seccion_id = rec_sec.id
      order by horas_semanales desc
    loop
      placed := 0;
      <<slots>>
      for p in 1..6 loop
        for d in 1..5 loop
          exit slots when placed >= rec_asig.horas_semanales;
          begin
            insert into public.horarios (
              anio_id, seccion_id, asignatura_id, empleado_id, aula_id,
              dia_semana, hora_inicio, hora_fin)
            values (
              v_anio, rec_sec.id, rec_asig.asignatura_id, rec_asig.empleado_id,
              v_aula, d, ini[p], fin[p]);
            placed := placed + 1;
          exception when exclusion_violation then
            -- Franja ocupada (docente/aula/sección): probar la siguiente.
            null;
          end;
        end loop;
      end loop;
    end loop;
  end loop;
end $$;

commit;
