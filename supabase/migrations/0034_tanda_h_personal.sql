-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA H — Personal ampliado + eventuales + cumpleaños   ║
-- ║  Bloque único. Aplicar vía Management API (PAT temporal).            ║
-- ║                                                                        ║
-- ║  · empleados.fecha_nacimiento (para el widget de cumpleaños).         ║
-- ║  · evaluaciones_eventuales: notas/observaciones ocasionales fuera del  ║
-- ║    libro formal. RLS + FORCE; el docente sólo sus estudiantes.        ║
-- ║  · proximos_cumpleanos(dias): estudiantes + empleados próximos a       ║
-- ║    cumplir años (widget del panel).                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Fecha de nacimiento del personal ────────────────────────────────────
alter table public.empleados add column if not exists fecha_nacimiento date;

-- ══════════════════════════════════════════════════════════════════════
--  Evaluaciones eventuales (ocasionales, fuera del libro ponderado)
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.evaluaciones_eventuales (
  id             uuid primary key default gen_random_uuid(),
  sede_id        uuid not null references public.sedes(id) on delete cascade,
  estudiante_id  uuid not null references public.estudiantes(id) on delete cascade,
  asignatura_id  uuid references public.asignaturas(id) on delete set null,
  titulo         text not null,
  descripcion    text,
  nota           numeric(5,2) check (nota is null or (nota >= 0 and nota <= 100)),
  fecha          date not null default current_date,
  registrado_por uuid default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists idx_eval_event_est
  on public.evaluaciones_eventuales(estudiante_id, fecha desc);

drop trigger if exists trg_eval_event_updated on public.evaluaciones_eventuales;

alter table public.evaluaciones_eventuales enable row level security;
alter table public.evaluaciones_eventuales force row level security;

drop policy if exists eval_event_select on public.evaluaciones_eventuales;
create policy eval_event_select on public.evaluaciones_eventuales
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria')
    or (private.tiene_rol('docente') and private.ensena_estudiante(estudiante_id)));
drop policy if exists eval_event_write on public.evaluaciones_eventuales;
create policy eval_event_write on public.evaluaciones_eventuales
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador')
    or (private.tiene_rol('docente') and private.ensena_estudiante(estudiante_id)))
  with check (private.tiene_rol('director', 'coordinador')
    or (private.tiene_rol('docente') and private.ensena_estudiante(estudiante_id)));

-- ══════════════════════════════════════════════════════════════════════
--  Próximos cumpleaños (estudiantes + empleados) — widget del panel.
--  INVOKER: la RLS de estudiantes/empleados ya restringe al staff.
--  días_para = aproximado por día del año (suficiente para el widget).
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.proximos_cumpleanos(p_dias int default 15)
returns table (
  tipo text, nombre text, fecha_nacimiento date,
  dia int, mes int, edad int, dias_para int)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select 'estudiante'::text as tipo,
      e.apellidos || ', ' || e.nombres as nombre, e.fecha_nacimiento
    from public.estudiantes e
    where e.estado = 'activo' and e.fecha_nacimiento is not null
    union all
    select 'empleado',
      em.apellidos || ', ' || em.nombres, em.fecha_nacimiento
    from public.empleados em
    where em.estado = 'activo' and em.fecha_nacimiento is not null
  ),
  calc as (
    select b.*,
      (((extract(doy from b.fecha_nacimiento)::int
         - extract(doy from current_date)::int) % 366 + 366) % 366) as dp
    from base b
  )
  select tipo, nombre, fecha_nacimiento,
    extract(day from fecha_nacimiento)::int,
    extract(month from fecha_nacimiento)::int,
    (extract(year from age(current_date, fecha_nacimiento))::int
       + (case when dp = 0 then 0 else 1 end)) as edad,
    dp as dias_para
  from calc
  where dp <= p_dias
  order by dp, nombre;
$$;
revoke all on function public.proximos_cumpleanos(int) from public, anon;
grant execute on function public.proximos_cumpleanos(int) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  SEMILLA — fechas de nacimiento del personal + evaluaciones eventuales
-- ══════════════════════════════════════════════════════════════════════
do $$
declare v_sede uuid;
begin
  select id into v_sede from public.sedes order by created_at limit 1;

  -- Cumpleaños del personal: distribuidos por todo el calendario.
  update public.empleados
  set fecha_nacimiento =
    (date '1978-01-01' + ((abs(hashtext(id::text)) % 6570))::int)  -- ~18 años de rango
  where fecha_nacimiento is null;

  -- Evaluaciones eventuales de ejemplo.
  if v_sede is not null
     and not exists (select 1 from public.evaluaciones_eventuales limit 1) then
    insert into public.evaluaciones_eventuales
      (sede_id, estudiante_id, asignatura_id, titulo, descripcion, nota, fecha)
    select v_sede, e.id,
      (select a.id from public.asignaturas a where a.sede_id = v_sede
        order by a.nombre limit 1),
      'Participación destacada',
      'Aporte sobresaliente en actividad de aula.',
      (90 + abs(hashtext(e.id::text)) % 11)::numeric,
      current_date - (abs(hashtext(e.id::text)) % 40)
    from public.estudiantes e
    where e.estado = 'activo'
    order by e.apellidos
    limit 12;
  end if;
end $$;

commit;
