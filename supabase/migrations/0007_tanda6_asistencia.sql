-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 6 — Asistencia                                   ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Pase de lista por sección. Estados MINERD (presente, ausente,        ║
-- ║  tardanza, excusa, retiro anticipado). REGISTRO CERRADO INMUTABLE a   ║
-- ║  nivel de base de datos. Semilla de marzo 2026 para reportes.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_asistencia') then
    create type public.estado_asistencia as enum
      ('presente', 'ausente', 'tardanza', 'excusa', 'retiro_anticipado');
  end if;
end $$;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.asistencia_sesiones (
  id            uuid primary key default gen_random_uuid(),
  anio_id       uuid not null references public.anios_escolares(id) on delete cascade,
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  asignatura_id uuid references public.asignaturas(id) on delete set null,
  empleado_id   uuid references public.empleados(id) on delete set null,
  fecha         date not null,
  cerrada       boolean not null default false,
  cerrada_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- Una sesión diaria por sección (asignatura nula) y una por asignatura.
create unique index if not exists uq_asis_diaria
  on public.asistencia_sesiones (seccion_id, fecha)
  where asignatura_id is null;
create unique index if not exists uq_asis_asignatura
  on public.asistencia_sesiones (seccion_id, fecha, asignatura_id)
  where asignatura_id is not null;

create table if not exists public.asistencia_registros (
  id            uuid primary key default gen_random_uuid(),
  sesion_id     uuid not null references public.asistencia_sesiones(id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  estado        public.estado_asistencia not null default 'presente',
  observacion   text,
  created_at    timestamptz not null default now(),
  unique (sesion_id, estudiante_id)
);

create index if not exists idx_asis_ses_seccion on public.asistencia_sesiones(seccion_id, fecha);
create index if not exists idx_asis_reg_sesion on public.asistencia_registros(sesion_id);
create index if not exists idx_asis_reg_est on public.asistencia_registros(estudiante_id);

-- ── Inmutabilidad del registro cerrado (nivel de BD) ────────────────────
create or replace function private.bloquear_asistencia_cerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_cerrada boolean;
begin
  select cerrada into v_cerrada
  from public.asistencia_sesiones
  where id = coalesce(new.sesion_id, old.sesion_id);

  if v_cerrada then
    raise exception 'Registro de asistencia cerrado: no se puede modificar.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_asis_inmutable on public.asistencia_registros;
create trigger trg_asis_inmutable
  before insert or update or delete on public.asistencia_registros
  for each row execute function private.bloquear_asistencia_cerrada();

-- Impedir reabrir una sesión cerrada (solo se puede cerrar, no reabrir).
create or replace function private.bloquear_reapertura()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.cerrada and not new.cerrada then
    raise exception 'No se puede reabrir un registro de asistencia cerrado.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asis_no_reabrir on public.asistencia_sesiones;
create trigger trg_asis_no_reabrir
  before update on public.asistencia_sesiones
  for each row execute function private.bloquear_reapertura();

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.asistencia_sesiones enable row level security;
alter table public.asistencia_sesiones force row level security;
alter table public.asistencia_registros enable row level security;
alter table public.asistencia_registros force row level security;

drop policy if exists asis_ses_select on public.asistencia_sesiones;
create policy asis_ses_select on public.asistencia_sesiones
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists asis_ses_write on public.asistencia_sesiones;
create policy asis_ses_write on public.asistencia_sesiones
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente'))
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

drop policy if exists asis_reg_select on public.asistencia_registros;
create policy asis_reg_select on public.asistencia_registros
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists asis_reg_write on public.asistencia_registros;
create policy asis_reg_write on public.asistencia_registros
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente'))
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

-- ── RPCs de reporte (SECURITY INVOKER: respetan RLS) ───────────────────
create or replace function public.resumen_asistencia(p_anio uuid)
returns table (
  seccion_id uuid, total bigint, presentes bigint, ausentes bigint,
  tardanzas bigint, otros bigint)
language sql stable security invoker set search_path = ''
as $$
  select ses.seccion_id,
    count(*)::bigint,
    count(*) filter (where r.estado = 'presente')::bigint,
    count(*) filter (where r.estado = 'ausente')::bigint,
    count(*) filter (where r.estado = 'tardanza')::bigint,
    count(*) filter (where r.estado in ('excusa', 'retiro_anticipado'))::bigint
  from public.asistencia_registros r
  join public.asistencia_sesiones ses on ses.id = r.sesion_id
  where ses.anio_id = p_anio
  group by ses.seccion_id;
$$;
revoke all on function public.resumen_asistencia(uuid) from public, anon;
grant execute on function public.resumen_asistencia(uuid) to authenticated, service_role;

create or replace function public.ausentismo(p_anio uuid, p_umbral int)
returns table (estudiante_id uuid, ausencias bigint)
language sql stable security invoker set search_path = ''
as $$
  select r.estudiante_id, count(*)::bigint as ausencias
  from public.asistencia_registros r
  join public.asistencia_sesiones ses on ses.id = r.sesion_id
  where ses.anio_id = p_anio and r.estado = 'ausente'
  group by r.estudiante_id
  having count(*) >= p_umbral
  order by count(*) desc
  limit 50;
$$;
revoke all on function public.ausentismo(uuid, int) from public, anon;
grant execute on function public.ausentismo(uuid, int) to authenticated, service_role;

-- ── Semilla: asistencia de marzo 2026 (P3 en curso), sesiones cerradas ──
do $$
declare
  v_anio uuid;
  v_fallback uuid;
begin
  if exists (select 1 from public.asistencia_sesiones limit 1) then
    return;
  end if;

  select id into v_anio from public.anios_escolares where nombre = '2025–2026';
  select id into v_fallback from public.empleados where tipo = 'docente' order by codigo limit 1;

  -- Sesiones diarias (abiertas) por sección, días hábiles de marzo 2026.
  insert into public.asistencia_sesiones (anio_id, seccion_id, empleado_id, fecha, cerrada)
  select v_anio, s.id,
    coalesce(
      (select ds.empleado_id from public.docente_secciones ds
        where ds.seccion_id = s.id limit 1),
      v_fallback),
    d.fecha, false
  from public.secciones s
  cross join (
    select gd::date as fecha
    from generate_series(date '2026-03-02', date '2026-03-20', interval '1 day') gd
    where extract(dow from gd) between 1 and 5
  ) d
  where s.anio_id = v_anio;

  -- Registros por estudiante inscrito (distribución realista, determinista).
  insert into public.asistencia_registros (sesion_id, estudiante_id, estado)
  select ses.id, m.estudiante_id,
    (case
       when r.v < 88 then 'presente'
       when r.v < 94 then 'tardanza'
       when r.v < 98 then 'ausente'
       when r.v < 99 then 'excusa'
       else 'retiro_anticipado'
     end)::public.estado_asistencia
  from public.asistencia_sesiones ses
  join public.matriculas m
    on m.seccion_id = ses.seccion_id and m.anio_id = ses.anio_id and m.estado = 'activa'
  cross join lateral (
    select abs(hashtext(m.estudiante_id::text || ses.fecha::text)) % 100 as v
  ) r
  where ses.anio_id = v_anio;

  -- Cerrar todas las sesiones sembradas (inmutables desde ya).
  update public.asistencia_sesiones
  set cerrada = true, cerrada_at = now()
  where anio_id = v_anio;
end $$;

commit;
