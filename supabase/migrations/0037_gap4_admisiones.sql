-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · GAP 4 — Admisiones online                               ║
-- ║  Aplicar vía Management API (PAT temporal).                          ║
-- ║                                                                        ║
-- ║  Formulario público de solicitud (anon vía RPC DEFINER), consulta     ║
-- ║  pública de estado por código de seguimiento, y panel interno con     ║
-- ║  embudo de admisión (estados), entrevista, notas y matriculación de   ║
-- ║  un aspirante aceptado (crea estudiante + tutor + matrícula).         ║
-- ║  RLS + FORCE deny-all; bitácora de eventos append-only.               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipo ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_solicitud') then
    create type public.estado_solicitud as enum (
      'recibida', 'en_revision', 'entrevista',
      'aceptada', 'lista_espera', 'rechazada', 'matriculada');
  end if;
end $$;

-- ── Tabla: solicitudes de admisión ──────────────────────────────────────
create table if not exists public.solicitudes_admision (
  id                         uuid primary key default gen_random_uuid(),
  sede_id                    uuid not null references public.sedes(id) on delete cascade,
  codigo                     text not null unique,
  anio_escolar               text not null,
  grado_id                   uuid not null references public.grados(id),
  aspirante_nombres          text not null,
  aspirante_apellidos        text not null,
  aspirante_sexo             public.sexo_estudiante not null,
  aspirante_fecha_nacimiento date not null,
  aspirante_nacionalidad     text not null default 'Dominicana',
  colegio_procedencia        text,
  tutor_nombres              text not null,
  tutor_apellidos            text not null,
  tutor_parentesco           public.parentesco not null default 'madre',
  tutor_telefono             text not null,
  tutor_email                text,
  tutor_cedula               text,
  mensaje                    text,
  estado                     public.estado_solicitud not null default 'recibida',
  notas_internas             text,
  entrevista_at              timestamptz,
  decidido_por               uuid references public.profiles(id) on delete set null,
  decidido_at                timestamptz,
  estudiante_id              uuid references public.estudiantes(id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index if not exists idx_solad_sede   on public.solicitudes_admision(sede_id);
create index if not exists idx_solad_estado on public.solicitudes_admision(estado);
create index if not exists idx_solad_grado  on public.solicitudes_admision(grado_id);

drop trigger if exists trg_solad_updated on public.solicitudes_admision;
create trigger trg_solad_updated
  before update on public.solicitudes_admision
  for each row execute function public.set_updated_at();

-- ── Tabla: bitácora de eventos (append-only) ────────────────────────────
create table if not exists public.admision_eventos (
  id              uuid primary key default gen_random_uuid(),
  solicitud_id    uuid not null references public.solicitudes_admision(id) on delete cascade,
  estado_anterior public.estado_solicitud,
  estado_nuevo    public.estado_solicitud not null,
  nota            text,
  actor           uuid default auth.uid(),
  created_at      timestamptz not null default now()
);
create index if not exists idx_admev_sol on public.admision_eventos(solicitud_id, created_at);

drop trigger if exists trg_admev_inmutable on public.admision_eventos;
create trigger trg_admev_inmutable
  before update or delete on public.admision_eventos
  for each row execute function public.impedir_cambios();

-- ── RLS + FORCE ─────────────────────────────────────────────────────────
alter table public.solicitudes_admision enable row level security;
alter table public.solicitudes_admision force row level security;
alter table public.admision_eventos enable row level security;
alter table public.admision_eventos force row level security;

-- Solicitudes: solo staff de admisión lee/actualiza. El alta pública entra
-- por RPC DEFINER; no hay política de INSERT para authenticated.
drop policy if exists solad_select on public.solicitudes_admision;
create policy solad_select on public.solicitudes_admision
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists solad_update on public.solicitudes_admision;
create policy solad_update on public.solicitudes_admision
  for update to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'))
  with check (private.tiene_rol('director', 'coordinador', 'secretaria'));

-- Eventos: staff lee; inserta (append-only por trigger). Sin update/delete.
drop policy if exists admev_select on public.admision_eventos;
create policy admev_select on public.admision_eventos
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists admev_insert on public.admision_eventos;
create policy admev_insert on public.admision_eventos
  for insert to authenticated
  with check (private.tiene_rol('director', 'coordinador', 'secretaria'));

-- ── RPC PÚBLICA: crear solicitud (anon) ─────────────────────────────────
-- SECURITY DEFINER: el aspirante no autenticado inserta a través de una
-- superficie mínima y validada. Devuelve el código de seguimiento.
create or replace function public.crear_solicitud_admision(
  p_grado             uuid,
  p_anio_escolar      text,
  p_asp_nombres       text,
  p_asp_apellidos     text,
  p_asp_sexo          text,
  p_asp_nacimiento    date,
  p_asp_nacionalidad  text,
  p_colegio_proc      text,
  p_tutor_nombres     text,
  p_tutor_apellidos   text,
  p_tutor_parentesco  text,
  p_tutor_telefono    text,
  p_tutor_email       text,
  p_tutor_cedula      text,
  p_mensaje           text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sede   uuid;
  v_codigo text;
  v_seq    int;
  v_exist  text;
begin
  -- El grado debe existir y de él se deriva la sede (evita suplantación).
  select n.sede_id into v_sede
  from public.grados g
  join public.niveles n on n.id = g.nivel_id
  where g.id = p_grado;
  if v_sede is null then
    raise exception 'Grado no válido';
  end if;

  -- Validaciones mínimas del lado servidor (defensa en profundidad).
  if length(coalesce(trim(p_asp_nombres), '')) < 2
     or length(coalesce(trim(p_asp_apellidos), '')) < 2
     or length(coalesce(trim(p_tutor_nombres), '')) < 2
     or length(coalesce(trim(p_tutor_apellidos), '')) < 2
     or length(regexp_replace(coalesce(p_tutor_telefono, ''), '\D', '', 'g')) < 10
     or p_asp_nacimiento is null
     or p_asp_nacimiento > current_date then
    raise exception 'Datos incompletos';
  end if;

  -- Idempotencia suave: si ya hay una solicitud abierta del mismo correo
  -- para el mismo grado, se devuelve su código en lugar de duplicar.
  if coalesce(trim(p_tutor_email), '') <> '' then
    select codigo into v_exist
    from public.solicitudes_admision
    where grado_id = p_grado
      and lower(tutor_email) = lower(trim(p_tutor_email))
      and estado in ('recibida', 'en_revision', 'entrevista')
    order by created_at desc
    limit 1;
    if v_exist is not null then
      return v_exist;
    end if;
  end if;

  select count(*) + 1 into v_seq
  from public.solicitudes_admision
  where sede_id = v_sede
    and extract(year from created_at) = extract(year from current_date);
  v_codigo := 'ADM-' || extract(year from current_date)::int || '-'
              || lpad(v_seq::text, 4, '0');

  insert into public.solicitudes_admision (
    sede_id, codigo, anio_escolar, grado_id,
    aspirante_nombres, aspirante_apellidos, aspirante_sexo,
    aspirante_fecha_nacimiento, aspirante_nacionalidad, colegio_procedencia,
    tutor_nombres, tutor_apellidos, tutor_parentesco, tutor_telefono,
    tutor_email, tutor_cedula, mensaje)
  values (
    v_sede, v_codigo, coalesce(nullif(trim(p_anio_escolar), ''), '2026-2027'),
    p_grado,
    trim(p_asp_nombres), trim(p_asp_apellidos),
    (case when upper(p_asp_sexo) = 'M' then 'M' else 'F' end)::public.sexo_estudiante,
    p_asp_nacimiento, coalesce(nullif(trim(p_asp_nacionalidad), ''), 'Dominicana'),
    nullif(trim(p_colegio_proc), ''),
    trim(p_tutor_nombres), trim(p_tutor_apellidos),
    (case when p_tutor_parentesco in
        ('padre', 'madre', 'tutor_legal', 'abuelo', 'abuela', 'tio', 'tia', 'otro')
      then p_tutor_parentesco else 'otro' end)::public.parentesco,
    trim(p_tutor_telefono), nullif(trim(p_tutor_email), ''),
    nullif(trim(p_tutor_cedula), ''), nullif(trim(p_mensaje), ''));

  return v_codigo;
end;
$$;
revoke all on function public.crear_solicitud_admision(
  uuid, text, text, text, text, date, text, text, text, text, text, text,
  text, text, text) from public;
grant execute on function public.crear_solicitud_admision(
  uuid, text, text, text, text, date, text, text, text, text, text, text,
  text, text, text) to anon, service_role;
-- Supabase concede EXECUTE a authenticated por privilegios por defecto;
-- este endpoint es solo para el público (anon), así que se revoca.
revoke execute on function public.crear_solicitud_admision(
  uuid, text, text, text, text, date, text, text, text, text, text, text,
  text, text, text) from authenticated;

-- ── RPC PÚBLICA: consultar estado por código (anon) ─────────────────────
-- Expone únicamente iniciales + grado + estado, nunca datos personales.
create or replace function public.consultar_solicitud_admision(p_codigo text)
returns table (
  existe        boolean,
  codigo        text,
  aspirante     text,
  grado         text,
  estado        public.estado_solicitud,
  actualizada   timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    true,
    s.codigo,
    left(s.aspirante_nombres, 1) || '. ' || left(s.aspirante_apellidos, 1) || '.',
    g.nombre,
    s.estado,
    s.updated_at
  from public.solicitudes_admision s
  join public.grados g on g.id = s.grado_id
  where upper(s.codigo) = upper(trim(p_codigo))
  limit 1;
$$;
revoke all on function public.consultar_solicitud_admision(text) from public;
grant execute on function public.consultar_solicitud_admision(text) to anon, service_role;
revoke execute on function public.consultar_solicitud_admision(text) from authenticated;

-- ── RPC PÚBLICA: grados disponibles para el formulario (anon) ───────────
-- El formulario público necesita las opciones de grado sin sesión. Expone
-- solo id + etiqueta legible de la sede principal.
create or replace function public.admision_grados()
returns table (id uuid, etiqueta text, orden int)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id,
         n.nombre || ' · ' || g.nombre,
         (n.orden * 100 + g.orden)
  from public.grados g
  join public.niveles n on n.id = g.nivel_id
  where n.sede_id = (select id from public.sedes order by created_at asc limit 1)
  order by n.orden, g.orden;
$$;
revoke all on function public.admision_grados() from public;
grant execute on function public.admision_grados() to anon, service_role;
revoke execute on function public.admision_grados() from authenticated;

-- ── RPC INTERNA: resumen del embudo (KPIs) ──────────────────────────────
create or replace function public.admisiones_resumen()
returns table (
  recibida int, en_revision int, entrevista int, aceptada int,
  lista_espera int, rechazada int, matriculada int, total int)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where estado = 'recibida')::int,
    count(*) filter (where estado = 'en_revision')::int,
    count(*) filter (where estado = 'entrevista')::int,
    count(*) filter (where estado = 'aceptada')::int,
    count(*) filter (where estado = 'lista_espera')::int,
    count(*) filter (where estado = 'rechazada')::int,
    count(*) filter (where estado = 'matriculada')::int,
    count(*)::int
  from public.solicitudes_admision;
$$;
revoke all on function public.admisiones_resumen() from public, anon;
grant execute on function public.admisiones_resumen() to authenticated, service_role;

-- ── RPC INTERNA: cambiar estado + bitácora (INVOKER) ────────────────────
create or replace function public.cambiar_estado_solicitud(
  p_solicitud uuid, p_estado public.estado_solicitud, p_nota text default null,
  p_entrevista timestamptz default null)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare v_ant public.estado_solicitud;
begin
  if not private.tiene_rol('director', 'coordinador', 'secretaria') then
    raise exception 'No autorizado';
  end if;
  if p_estado = 'matriculada' then
    raise exception 'Use matricular_aspirante para matricular';
  end if;

  select estado into v_ant from public.solicitudes_admision where id = p_solicitud;
  if v_ant is null then raise exception 'Solicitud no encontrada'; end if;

  update public.solicitudes_admision
  set estado        = p_estado,
      notas_internas = coalesce(nullif(trim(p_nota), ''), notas_internas),
      entrevista_at = coalesce(p_entrevista, entrevista_at),
      decidido_por  = case when p_estado in ('aceptada', 'rechazada', 'lista_espera')
                        then (select auth.uid()) else decidido_por end,
      decidido_at   = case when p_estado in ('aceptada', 'rechazada', 'lista_espera')
                        then now() else decidido_at end
  where id = p_solicitud;

  insert into public.admision_eventos (solicitud_id, estado_anterior, estado_nuevo, nota)
  values (p_solicitud, v_ant, p_estado, nullif(trim(p_nota), ''));
end;
$$;
revoke all on function public.cambiar_estado_solicitud(
  uuid, public.estado_solicitud, text, timestamptz) from public, anon;
grant execute on function public.cambiar_estado_solicitud(
  uuid, public.estado_solicitud, text, timestamptz) to authenticated, service_role;

-- ── RPC INTERNA: matricular aspirante (INVOKER) ─────────────────────────
-- Crea estudiante + tutor + vínculo + matrícula y marca la solicitud como
-- 'matriculada'. Corre como el usuario staff (INVOKER): las inserciones
-- pasan por las políticas RLS existentes de cada tabla.
create or replace function public.matricular_aspirante(
  p_solicitud uuid, p_seccion uuid)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  s        public.solicitudes_admision%rowtype;
  v_anio   uuid;
  v_fam    uuid;
  v_tutor  uuid;
  v_est    uuid;
  v_codigo text;
  v_seq    int;
begin
  -- Crear estudiante/matrícula es competencia de dirección/secretaría
  -- (coincide con las políticas RLS de esas tablas).
  if not private.tiene_rol('director', 'secretaria') then
    raise exception 'No autorizado';
  end if;

  select * into s from public.solicitudes_admision where id = p_solicitud;
  if s.id is null then raise exception 'Solicitud no encontrada'; end if;
  if s.estado = 'matriculada' then raise exception 'Ya fue matriculada'; end if;
  if s.estado <> 'aceptada' then
    raise exception 'Solo se matriculan solicitudes aceptadas';
  end if;

  -- Año escolar activo (destino de la matrícula) y validación de sección.
  select id into v_anio from public.anios_escolares
  where sede_id = s.sede_id and activo order by created_at desc limit 1;
  if v_anio is null then
    select id into v_anio from public.anios_escolares
    where sede_id = s.sede_id order by created_at desc limit 1;
  end if;
  if v_anio is null then raise exception 'No hay año escolar'; end if;
  if not exists (select 1 from public.secciones where id = p_seccion and anio_id = v_anio) then
    raise exception 'Sección no válida para el año activo';
  end if;

  -- Código único de estudiante para altas por admisión.
  select count(*) + 1 into v_seq from public.estudiantes
  where sede_id = s.sede_id and codigo like 'EST-ADM-%';
  v_codigo := 'EST-ADM-' || lpad(v_seq::text, 4, '0');

  insert into public.familias (sede_id, apellido_familiar)
  values (s.sede_id, s.aspirante_apellidos) returning id into v_fam;

  insert into public.tutores (sede_id, nombres, apellidos, cedula, telefono, email)
  values (s.sede_id, s.tutor_nombres, s.tutor_apellidos, s.tutor_cedula,
          s.tutor_telefono, s.tutor_email)
  returning id into v_tutor;

  insert into public.estudiantes (
    sede_id, familia_id, codigo, nombres, apellidos, sexo, fecha_nacimiento,
    nacionalidad, estado)
  values (
    s.sede_id, v_fam, v_codigo, s.aspirante_nombres, s.aspirante_apellidos,
    s.aspirante_sexo, s.aspirante_fecha_nacimiento, s.aspirante_nacionalidad,
    'activo')
  returning id into v_est;

  insert into public.estudiante_tutores (
    estudiante_id, tutor_id, parentesco, es_contacto_emergencia,
    autorizado_retirar, principal)
  values (v_est, v_tutor, s.tutor_parentesco, true, true, true);

  insert into public.matriculas (estudiante_id, anio_id, seccion_id, tipo, estado)
  values (v_est, v_anio, p_seccion, 'inscripcion', 'activa');

  update public.solicitudes_admision
  set estado = 'matriculada', estudiante_id = v_est,
      decidido_por = (select auth.uid()), decidido_at = now()
  where id = p_solicitud;

  insert into public.admision_eventos (solicitud_id, estado_anterior, estado_nuevo, nota)
  values (p_solicitud, s.estado, 'matriculada',
          'Matriculado como ' || v_codigo);

  return v_est;
end;
$$;
revoke all on function public.matricular_aspirante(uuid, uuid) from public, anon;
grant execute on function public.matricular_aspirante(uuid, uuid) to authenticated, service_role;

-- ── SEMILLA — solicitudes de muestra ────────────────────────────────────
do $$
declare
  v_sede    uuid;
  v_grados  uuid[];
  v_g       uuid;
  i         int;
  nombres_m text[] := array['Mateo','Liam','Thiago','Dylan','Adriel','Sebastián','Ian'];
  nombres_f text[] := array['Emma','Victoria','Isabella','Camila','Valentina','Luciana','Mía'];
  apellidos text[] := array['Fernández','Peña','Rosario','Guzmán','Hernández','Cabrera','Núñez','Reyes'];
  tut_nom   text[] := array['Rosa','Miguel','Carmen','José','Ana','Luis','Marisol','Pedro'];
  estados   public.estado_solicitud[] := array[
    'recibida','recibida','recibida','en_revision','en_revision',
    'entrevista','entrevista','aceptada','aceptada','lista_espera','rechazada']::public.estado_solicitud[];
  est_row   public.estado_solicitud;
  v_sexo    public.sexo_estudiante;
  v_codigo  text;
begin
  select id into v_sede from public.sedes order by created_at asc limit 1;
  if v_sede is null then return; end if;
  if exists (select 1 from public.solicitudes_admision) then return; end if;

  select array_agg(g.id order by n.orden, g.orden) into v_grados
  from public.grados g join public.niveles n on n.id = g.nivel_id
  where n.sede_id = v_sede;
  if v_grados is null or array_length(v_grados, 1) = 0 then return; end if;

  for i in 1..array_length(estados, 1) loop
    est_row := estados[i];
    v_g := v_grados[1 + (i * 3) % array_length(v_grados, 1)];
    if i % 2 = 0 then
      v_sexo := 'F';
    else
      v_sexo := 'M';
    end if;
    v_codigo := 'ADM-2026-' || lpad(i::text, 4, '0');

    insert into public.solicitudes_admision (
      sede_id, codigo, anio_escolar, grado_id,
      aspirante_nombres, aspirante_apellidos, aspirante_sexo,
      aspirante_fecha_nacimiento, colegio_procedencia,
      tutor_nombres, tutor_apellidos, tutor_parentesco, tutor_telefono,
      tutor_email, mensaje, estado,
      entrevista_at,
      decidido_por, decidido_at, created_at)
    values (
      v_sede, v_codigo, '2026-2027', v_g,
      case when v_sexo = 'F' then nombres_f[1 + i % array_length(nombres_f,1)]
           else nombres_m[1 + i % array_length(nombres_m,1)] end,
      apellidos[1 + i % array_length(apellidos,1)] || ' ' ||
        apellidos[1 + (i*2) % array_length(apellidos,1)],
      v_sexo,
      make_date(2019 - (i % 6), 1 + (i*5) % 12, 1 + (i*7) % 28),
      case when i % 3 = 0 then 'Colegio Evangélico Bethel'
           when i % 3 = 1 then 'Escuela Primaria Duarte' else null end,
      tut_nom[1 + i % array_length(tut_nom,1)],
      apellidos[1 + i % array_length(apellidos,1)],
      case when i % 2 = 0 then 'madre' else 'padre' end::public.parentesco,
      '809' || lpad((2000000 + i * 34567)::text, 7, '0'),
      lower(tut_nom[1 + i % array_length(tut_nom,1)]) || i::text || '@correo.com',
      case when i % 4 = 0 then 'Nos interesa el enfoque en valores del colegio.' else null end,
      est_row,
      case when est_row = 'entrevista'
        then (now() + make_interval(days => i)) else null end,
      null, null,
      now() - make_interval(days => (array_length(estados,1) - i) * 2));

    -- Bitácora inicial de cada solicitud.
    insert into public.admision_eventos (solicitud_id, estado_anterior, estado_nuevo, nota, created_at)
    select id, null, 'recibida', 'Solicitud recibida por el portal público',
           created_at
    from public.solicitudes_admision where codigo = v_codigo;
    if est_row <> 'recibida' then
      insert into public.admision_eventos (solicitud_id, estado_anterior, estado_nuevo, created_at)
      select id, 'recibida', est_row, created_at + interval '1 day'
      from public.solicitudes_admision where codigo = v_codigo;
    end if;
  end loop;
end $$;

commit;
