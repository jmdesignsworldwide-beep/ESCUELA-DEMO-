-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 17 — Disciplina y Conducta                      ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Incidencias (méritos/deméritos con gravedad y puntos), registro      ║
-- ║  INMUTABLE (append-only), seguimiento por estudiante y visibilidad    ║
-- ║  hermética en el portal de familias.                                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_disciplina') then
    create type public.categoria_disciplina as enum ('merito', 'demerito');
  end if;
  if not exists (select 1 from pg_type where typname = 'gravedad_disciplina') then
    create type public.gravedad_disciplina as enum ('leve', 'grave', 'muy_grave');
  end if;
end $$;

-- ── Tabla (append-only) ─────────────────────────────────────────────────
create table if not exists public.incidencias_disciplina (
  id             uuid primary key default gen_random_uuid(),
  sede_id        uuid not null references public.sedes(id) on delete cascade,
  estudiante_id  uuid not null references public.estudiantes(id) on delete cascade,
  anio_id        uuid references public.anios_escolares(id) on delete set null,
  categoria      public.categoria_disciplina not null,
  gravedad       public.gravedad_disciplina,
  titulo         text not null,
  descripcion    text,
  medida         text,
  puntos         int not null default 0,
  fecha          date not null default current_date,
  reportado_por  uuid references public.profiles(id) on delete set null,
  reportado_email text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_incid_est on public.incidencias_disciplina(estudiante_id);
create index if not exists idx_incid_fecha on public.incidencias_disciplina(fecha desc);

-- ── Inmutabilidad (append-only: sin UPDATE/DELETE/TRUNCATE) ────────────
drop trigger if exists trg_incid_no_update on public.incidencias_disciplina;
create trigger trg_incid_no_update
  before update or delete on public.incidencias_disciplina
  for each row execute function public.impedir_cambios();
drop trigger if exists trg_incid_no_truncate on public.incidencias_disciplina;
create trigger trg_incid_no_truncate
  before truncate on public.incidencias_disciplina
  for each statement execute function public.impedir_cambios();

-- ── RLS (dirección/coordinación/docencia registran; secretaría lee) ────
alter table public.incidencias_disciplina enable row level security;
alter table public.incidencias_disciplina force row level security;
drop policy if exists incid_select on public.incidencias_disciplina;
create policy incid_select on public.incidencias_disciplina
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente', 'secretaria'));
drop policy if exists incid_insert on public.incidencias_disciplina;
create policy incid_insert on public.incidencias_disciplina
  for insert to authenticated
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

-- ── Resumen de conducta por estudiante (staff) ─────────────────────────
create or replace function public.resumen_disciplina(p_est uuid)
returns table (meritos bigint, demeritos bigint, puntos bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where categoria = 'merito'),
    count(*) filter (where categoria = 'demerito'),
    coalesce(sum(puntos), 0)
  from public.incidencias_disciplina
  where estudiante_id = p_est;
$$;
revoke all on function public.resumen_disciplina(uuid) from public, anon;
grant execute on function public.resumen_disciplina(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  Portal: conducta del estudiante (private DEFINER + public INVOKER
--  wrapper). Valida pertenencia con private.mis_estudiantes().
-- ══════════════════════════════════════════════════════════════════════
create or replace function private.portal_disciplina(p_est uuid)
returns table (
  fecha date, categoria public.categoria_disciplina,
  gravedad public.gravedad_disciplina, titulo text, descripcion text,
  medida text, puntos int)
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
    select i.fecha, i.categoria, i.gravedad, i.titulo, i.descripcion,
      i.medida, i.puntos
    from public.incidencias_disciplina i
    where i.estudiante_id = p_est
    order by i.fecha desc, i.created_at desc;
end;
$$;
revoke all on function private.portal_disciplina(uuid) from public, anon;
grant execute on function private.portal_disciplina(uuid) to authenticated, service_role;

create or replace function public.portal_disciplina(p_est uuid)
returns table (
  fecha date, categoria public.categoria_disciplina,
  gravedad public.gravedad_disciplina, titulo text, descripcion text,
  medida text, puntos int)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.portal_disciplina(p_est); $$;
revoke all on function public.portal_disciplina(uuid) from public, anon;
grant execute on function public.portal_disciplina(uuid) to authenticated, service_role;

-- ── Semilla: conducta de ejemplo para el estudiante demo (Encarnación) ─
do $$
declare v_sede uuid; v_anio uuid; v_est uuid;
begin
  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  select id into v_anio from public.anios_escolares where activo order by created_at limit 1;
  -- Estudiante vinculado a la cuenta demo del portal.
  select id into v_est from public.estudiantes
    where profile_id = (select id from auth.users where email = 'estudiante.demo@jmescolar.do');
  if v_est is null or v_sede is null then return; end if;

  if not exists (select 1 from public.incidencias_disciplina where estudiante_id = v_est) then
    insert into public.incidencias_disciplina
      (sede_id, estudiante_id, anio_id, categoria, gravedad, titulo, descripcion, medida, puntos, fecha)
    values
      (v_sede, v_est, v_anio, 'merito', null,
       'Excelente participación', 'Destacó por su colaboración en el proyecto de ciencias.',
       'Reconocimiento en formación', 5, current_date - 20),
      (v_sede, v_est, v_anio, 'demerito', 'leve',
       'Llegada tardía reiterada', 'Tres tardanzas en la semana.',
       'Amonestación verbal y nota a los padres', -2, current_date - 8),
      (v_sede, v_est, v_anio, 'merito', null,
       'Ayuda a un compañero', 'Apoyó a un compañero con dificultades en matemáticas.',
       'Felicitación', 3, current_date - 3);
  end if;
end $$;

commit;
