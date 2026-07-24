-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 7 — Calificaciones (el corazón del sistema)      ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Libro de calificaciones por componente (ponderación configurable).   ║
-- ║  PERÍODO CERRADO INMUTABLE a nivel de BD; solo el director corrige,   ║
-- ║  con justificación obligatoria registrada en la bitácora inviolable.  ║
-- ║  Semilla: P1 y P2 cerrados, P3 en curso, con estudiantes en riesgo.   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.calificacion_componentes (
  id            uuid primary key default gen_random_uuid(),
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  asignatura_id uuid not null references public.asignaturas(id) on delete cascade,
  periodo_id    uuid not null references public.periodos(id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  componente_id uuid not null references public.ponderacion_componentes(id) on delete cascade,
  valor         numeric(5,2) not null check (valor >= 0 and valor <= 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (seccion_id, asignatura_id, periodo_id, estudiante_id, componente_id)
);

-- Cierre del libro por (sección, asignatura, período).
create table if not exists public.libro_cierres (
  id            uuid primary key default gen_random_uuid(),
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  asignatura_id uuid not null references public.asignaturas(id) on delete cascade,
  periodo_id    uuid not null references public.periodos(id) on delete cascade,
  cerrado       boolean not null default false,
  cerrado_at    timestamptz,
  cerrado_por   uuid,
  unique (seccion_id, asignatura_id, periodo_id)
);

create index if not exists idx_calif_libro
  on public.calificacion_componentes(seccion_id, asignatura_id, periodo_id);
create index if not exists idx_calif_est on public.calificacion_componentes(estudiante_id);

drop trigger if exists trg_calif_updated_at on public.calificacion_componentes;
create trigger trg_calif_updated_at
  before update on public.calificacion_componentes
  for each row execute function public.set_updated_at();

-- ── Inmutabilidad del período cerrado (con bypass de corrección) ────────
create or replace function private.bloquear_calif_cerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cerrado boolean;
  v_sec uuid; v_asg uuid; v_per uuid;
begin
  v_sec := coalesce(new.seccion_id, old.seccion_id);
  v_asg := coalesce(new.asignatura_id, old.asignatura_id);
  v_per := coalesce(new.periodo_id, old.periodo_id);

  select cerrado into v_cerrado
  from public.libro_cierres
  where seccion_id = v_sec and asignatura_id = v_asg and periodo_id = v_per;

  if coalesce(v_cerrado, false)
     and coalesce(current_setting('app.permitir_correccion', true), '') <> 'on' then
    raise exception 'Período cerrado: la calificación es inmutable. Requiere corrección autorizada por el director.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_calif_inmutable on public.calificacion_componentes;
create trigger trg_calif_inmutable
  before insert or update or delete on public.calificacion_componentes
  for each row execute function private.bloquear_calif_cerrada();

-- ── Corrección autorizada por el director (bitácora obligatoria) ────────
-- SECURITY INVOKER: se autoriza a sí misma (solo director) y los usuarios de
-- la API no pueden fijar el GUC de bypass por su cuenta, así que la
-- inmutabilidad se mantiene. Invoker evita exponer una función SECURITY
-- DEFINER a `authenticated` (Advisor limpia).
create or replace function public.corregir_calificacion(
  p_calificacion uuid,
  p_valor numeric,
  p_justificacion text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_anterior numeric;
begin
  if not private.tiene_rol('director') then
    raise exception 'Solo el director puede autorizar correcciones.'
      using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_justificacion, ''))) < 5 then
    raise exception 'La justificación es obligatoria.'
      using errcode = 'check_violation';
  end if;
  if p_valor < 0 or p_valor > 100 then
    raise exception 'La calificación debe estar entre 0 y 100.'
      using errcode = 'check_violation';
  end if;

  select valor into v_anterior
  from public.calificacion_componentes where id = p_calificacion;

  perform set_config('app.permitir_correccion', 'on', true);
  update public.calificacion_componentes set valor = p_valor where id = p_calificacion;
  perform set_config('app.permitir_correccion', 'off', true);

  perform private.registrar_bitacora(
    'correccion_calificacion',
    'calificacion_componentes',
    p_calificacion::text,
    jsonb_build_object(
      'valor_anterior', v_anterior,
      'valor_nuevo', p_valor,
      'justificacion', p_justificacion));
end;
$$;

revoke all on function public.corregir_calificacion(uuid, numeric, text) from public, anon;
grant execute on function public.corregir_calificacion(uuid, numeric, text) to authenticated, service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.calificacion_componentes enable row level security;
alter table public.calificacion_componentes force row level security;
alter table public.libro_cierres enable row level security;
alter table public.libro_cierres force row level security;

drop policy if exists calif_select on public.calificacion_componentes;
create policy calif_select on public.calificacion_componentes
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists calif_write on public.calificacion_componentes;
create policy calif_write on public.calificacion_componentes
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente'))
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

drop policy if exists cierres_select on public.libro_cierres;
create policy cierres_select on public.libro_cierres
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists cierres_write on public.libro_cierres;
create policy cierres_write on public.libro_cierres
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente'))
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

-- ── Semilla: calificaciones P1/P2/P3 (Primaria y Secundaria) ────────────
do $$
declare v_anio uuid;
begin
  if exists (select 1 from public.calificacion_componentes limit 1) then
    return;
  end if;
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  -- Notas por componente (55..100 determinista; algunos < 70 = en riesgo).
  insert into public.calificacion_componentes
    (seccion_id, asignatura_id, periodo_id, estudiante_id, componente_id, valor)
  select s.id, p.asignatura_id, per.id, m.estudiante_id, c.id,
    (55 + abs(hashtext(
      m.estudiante_id::text || p.asignatura_id::text || per.id::text || c.id::text
    )) % 46)::numeric
  from public.secciones s
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  join public.pensum p on p.grado_id = g.id
  join public.matriculas m
    on m.seccion_id = s.id and m.anio_id = s.anio_id and m.estado = 'activa'
  join public.periodos per on per.anio_id = s.anio_id and per.orden in (1, 2, 3)
  join public.esquemas_ponderacion e
    on e.sede_id = n.sede_id and e.nombre = 'Ponderación estándar'
  join public.ponderacion_componentes c on c.esquema_id = e.id
  where n.codigo in ('PRIMARIA', 'SECUNDARIA') and s.anio_id = v_anio;

  -- Cierres: P1 y P2 cerrados; P3 en curso (abierto).
  insert into public.libro_cierres
    (seccion_id, asignatura_id, periodo_id, cerrado, cerrado_at)
  select distinct s.id, p.asignatura_id, per.id,
    (per.orden <= 2),
    case when per.orden <= 2 then now() else null end
  from public.secciones s
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  join public.pensum p on p.grado_id = g.id
  join public.periodos per on per.anio_id = s.anio_id and per.orden in (1, 2, 3)
  where n.codigo in ('PRIMARIA', 'SECUNDARIA') and s.anio_id = v_anio;
end $$;

commit;
