-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 16 — Comunicación (circulares y avisos)         ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Circulares con audiencia segmentada (todos/nivel/sección/morosos/    ║
-- ║  tutores), folio al publicar, INMUTABILIDAD tras publicar, visibilidad║
-- ║  hermética en el portal y destinatarios para WhatsApp.                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_circular') then
    create type public.tipo_circular as enum ('circular', 'aviso', 'urgente');
  end if;
  if not exists (select 1 from pg_type where typname = 'audiencia_circular') then
    create type public.audiencia_circular as enum
      ('todos', 'nivel', 'seccion', 'morosos', 'tutores');
  end if;
end $$;

-- ── Tabla ───────────────────────────────────────────────────────────────
create table if not exists public.circulares (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  autor_id      uuid references public.profiles(id) on delete set null,
  titulo        text not null,
  cuerpo        text not null,
  tipo          public.tipo_circular not null default 'circular',
  audiencia     public.audiencia_circular not null default 'todos',
  nivel_id      uuid references public.niveles(id) on delete set null,
  seccion_id    uuid references public.secciones(id) on delete set null,
  folio         text unique,
  publicada     boolean not null default false,
  publicada_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_circulares_pub
  on public.circulares(publicada, created_at desc);

-- ── Inmutabilidad tras publicar (permite borrador→publicada vía RPC) ───
create or replace function private.bloquear_circular_publicada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.publicada
     and coalesce(current_setting('app.permitir_publicar_circular', true), '') <> 'on' then
    raise exception 'Circular publicada: es inmutable.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_circular_inmutable on public.circulares;
create trigger trg_circular_inmutable
  before update or delete on public.circulares
  for each row execute function private.bloquear_circular_publicada();

-- ── RLS (staff gestiona; el portal usa RPC hermético) ──────────────────
alter table public.circulares enable row level security;
alter table public.circulares force row level security;
drop policy if exists circulares_select on public.circulares;
create policy circulares_select on public.circulares
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists circulares_write on public.circulares;
create policy circulares_write on public.circulares
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'))
  with check (private.tiene_rol('director', 'coordinador', 'secretaria'));

-- ── Publicar circular: asigna folio y la vuelve inmutable ──────────────
create or replace function public.publicar_circular(p_circular uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare v_folio text; v_pub boolean;
begin
  select publicada into v_pub from public.circulares where id = p_circular;
  if v_pub is null then raise exception 'Circular no encontrada.'; end if;
  if v_pub then raise exception 'La circular ya está publicada.'; end if;

  v_folio := 'CIR-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.folio_seq')::text, 5, '0');

  perform set_config('app.permitir_publicar_circular', 'on', true);
  update public.circulares
    set publicada = true, publicada_at = now(), folio = v_folio
    where id = p_circular;
  perform set_config('app.permitir_publicar_circular', 'off', true);

  perform private.registrar_bitacora(
    'publicar_circular', 'circulares', p_circular::text,
    jsonb_build_object('folio', v_folio));
  return v_folio;
end;
$$;
revoke all on function public.publicar_circular(uuid) from public, anon;
grant execute on function public.publicar_circular(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  Portal: circulares visibles al usuario (private DEFINER + public
--  INVOKER wrapper → Security Advisor limpio). Solo publicadas y según
--  la audiencia aplicada a los estudiantes del usuario.
-- ══════════════════════════════════════════════════════════════════════
create or replace function private.circulares_visibles()
returns table (
  id uuid, titulo text, cuerpo text, tipo public.tipo_circular,
  folio text, publicada_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.titulo, c.cuerpo, c.tipo, c.folio, c.publicada_at
  from public.circulares c
  where c.publicada and (
    c.audiencia in ('todos', 'tutores')
    or (c.audiencia = 'nivel' and exists (
        select 1 from public.matriculas m
        join public.secciones s on s.id = m.seccion_id
        join public.grados g on g.id = s.grado_id
        where m.estudiante_id in (select private.mis_estudiantes())
          and m.estado = 'activa' and g.nivel_id = c.nivel_id))
    or (c.audiencia = 'seccion' and exists (
        select 1 from public.matriculas m
        where m.estudiante_id in (select private.mis_estudiantes())
          and m.estado = 'activa' and m.seccion_id = c.seccion_id))
    or (c.audiencia = 'morosos' and exists (
        select 1 from public.cargos cg
        where cg.estudiante_id in (select private.mis_estudiantes())
          and cg.estado in ('pendiente', 'parcial')
          and cg.vencimiento is not null and cg.vencimiento < current_date))
  )
  order by c.publicada_at desc;
$$;
revoke all on function private.circulares_visibles() from public, anon;
grant execute on function private.circulares_visibles() to authenticated, service_role;

create or replace function public.circulares_visibles()
returns table (
  id uuid, titulo text, cuerpo text, tipo public.tipo_circular,
  folio text, publicada_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.circulares_visibles(); $$;
revoke all on function public.circulares_visibles() from public, anon;
grant execute on function public.circulares_visibles() to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  Destinatarios de una circular (para WhatsApp). Solo staff. Devuelve el
--  tutor principal con teléfono de cada estudiante de la audiencia.
-- ══════════════════════════════════════════════════════════════════════
create or replace function private.destinatarios_circular(p_circular uuid)
returns table (estudiante text, tutor text, telefono text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare c public.circulares;
begin
  if not private.tiene_rol('director', 'coordinador', 'secretaria') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.circulares where id = p_circular;
  if not found then return; end if;

  return query
    select e.nombres || ' ' || e.apellidos, t.nombres || ' ' || t.apellidos, t.telefono
    from public.estudiantes e
    join public.estudiante_tutores et on et.estudiante_id = e.id and et.principal
    join public.tutores t on t.id = et.tutor_id
    left join public.matriculas m on m.estudiante_id = e.id and m.estado = 'activa'
    left join public.secciones s on s.id = m.seccion_id
    left join public.grados g on g.id = s.grado_id
    where e.estado = 'activo' and t.telefono is not null and (
      c.audiencia in ('todos', 'tutores')
      or (c.audiencia = 'nivel' and g.nivel_id = c.nivel_id)
      or (c.audiencia = 'seccion' and m.seccion_id = c.seccion_id)
      or (c.audiencia = 'morosos' and exists (
          select 1 from public.cargos cg where cg.estudiante_id = e.id
            and cg.estado in ('pendiente', 'parcial')
            and cg.vencimiento is not null and cg.vencimiento < current_date))
    )
    order by e.apellidos, e.nombres;
end;
$$;
revoke all on function private.destinatarios_circular(uuid) from public, anon;
grant execute on function private.destinatarios_circular(uuid) to authenticated, service_role;

create or replace function public.destinatarios_circular(p_circular uuid)
returns table (estudiante text, tutor text, telefono text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.destinatarios_circular(p_circular); $$;
revoke all on function public.destinatarios_circular(uuid) from public, anon;
grant execute on function public.destinatarios_circular(uuid) to authenticated, service_role;

-- ── Semilla: circulares de ejemplo ─────────────────────────────────────
do $$
declare v_sede uuid; v_cir uuid;
begin
  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  if v_sede is null then return; end if;

  if not exists (select 1 from public.circulares where sede_id = v_sede) then
    -- Publicada: bienvenida a todos.
    insert into public.circulares (sede_id, titulo, cuerpo, tipo, audiencia)
    values (v_sede, 'Bienvenida al año escolar 2025–2026',
      'Estimadas familias, les damos la más cordial bienvenida al nuevo año escolar. Las clases inician el lunes según el calendario oficial. Agradecemos su puntualidad y compromiso.',
      'circular', 'todos')
    returning id into v_cir;
    perform public.publicar_circular(v_cir);

    -- Publicada: recordatorio a familias morosas.
    insert into public.circulares (sede_id, titulo, cuerpo, tipo, audiencia)
    values (v_sede, 'Recordatorio de pagos pendientes',
      'Les recordamos amablemente mantener al día las mensualidades para evitar recargos por mora y garantizar el acceso continuo a los servicios académicos.',
      'aviso', 'morosos')
    returning id into v_cir;
    perform public.publicar_circular(v_cir);

    -- Borrador: reunión de padres (aún sin publicar).
    insert into public.circulares (sede_id, titulo, cuerpo, tipo, audiencia)
    values (v_sede, 'Convocatoria a reunión de padres',
      'Se convoca a una reunión general de padres y tutores para el próximo viernes en el salón de actos. Su asistencia es muy importante.',
      'urgente', 'tutores');
  end if;
end $$;

commit;
