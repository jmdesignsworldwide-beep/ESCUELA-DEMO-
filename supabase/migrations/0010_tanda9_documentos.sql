-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 9 — Boletines y Documentos Oficiales             ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Registro de documentos emitidos con FOLIO ÚNICO VERIFICABLE e        ║
-- ║  INMUTABLE. Boletines (por nivel), certificaciones, constancias,      ║
-- ║  récord de notas y carta de buena conducta.                          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipo ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_documento_oficial') then
    create type public.tipo_documento_oficial as enum (
      'boletin_periodo', 'boletin_anual', 'certificacion',
      'constancia_inscripcion', 'record_notas', 'buena_conducta');
  end if;
end $$;

-- Secuencia de folios.
create sequence if not exists public.folio_seq;
grant usage, select on sequence public.folio_seq to authenticated, service_role;

-- ── Tabla ───────────────────────────────────────────────────────────────
create table if not exists public.documentos_emitidos (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  folio         text not null unique,
  tipo          public.tipo_documento_oficial not null,
  estudiante_id uuid references public.estudiantes(id) on delete set null,
  anio_id       uuid references public.anios_escolares(id) on delete set null,
  periodo_id    uuid references public.periodos(id) on delete set null,
  emitido_por   uuid,
  emitido_email text,
  datos         jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_docem_estudiante on public.documentos_emitidos(estudiante_id);
create index if not exists idx_docem_tipo on public.documentos_emitidos(tipo);

-- ── Inmutabilidad (append-only: sin UPDATE/DELETE/TRUNCATE) ─────────────
drop trigger if exists trg_docem_no_update on public.documentos_emitidos;
create trigger trg_docem_no_update
  before update or delete on public.documentos_emitidos
  for each row execute function public.impedir_cambios();
drop trigger if exists trg_docem_no_truncate on public.documentos_emitidos;
create trigger trg_docem_no_truncate
  before truncate on public.documentos_emitidos
  for each statement execute function public.impedir_cambios();

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.documentos_emitidos enable row level security;
alter table public.documentos_emitidos force row level security;

drop policy if exists docem_select on public.documentos_emitidos;
create policy docem_select on public.documentos_emitidos
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));

-- Inserción únicamente vía la función emitir_documento (no política de insert).

-- ── Emisión de documento (folio + registro) ────────────────────────────
-- Impl privada SECURITY DEFINER (no expuesta a la API): inserta sorteando
-- la RLS de forma controlada y valida el rol. El wrapper público es
-- SECURITY INVOKER (Advisor limpia).
create or replace function private.emitir_documento_impl(
  p_tipo public.tipo_documento_oficial,
  p_estudiante uuid,
  p_anio uuid,
  p_periodo uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sede uuid;
  v_folio text;
  v_email text;
begin
  if not private.tiene_rol('director', 'coordinador', 'secretaria') then
    raise exception 'No autorizado para emitir documentos.'
      using errcode = 'insufficient_privilege';
  end if;

  select id into v_sede from public.sedes where activa order by codigo limit 1;
  select email into v_email from auth.users where id = (select auth.uid());

  v_folio := 'CSRA-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.folio_seq')::text, 6, '0');

  insert into public.documentos_emitidos
    (sede_id, folio, tipo, estudiante_id, anio_id, periodo_id, emitido_por, emitido_email)
  values (v_sede, v_folio, p_tipo, p_estudiante, p_anio, p_periodo,
    (select auth.uid()), v_email);

  perform private.registrar_bitacora(
    'emision_documento', 'documentos_emitidos', v_folio,
    jsonb_build_object('tipo', p_tipo, 'estudiante', p_estudiante));

  return v_folio;
end;
$$;
revoke all on function private.emitir_documento_impl(public.tipo_documento_oficial, uuid, uuid, uuid) from public, anon;
grant execute on function private.emitir_documento_impl(public.tipo_documento_oficial, uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.emitir_documento(
  p_tipo public.tipo_documento_oficial,
  p_estudiante uuid,
  p_anio uuid,
  p_periodo uuid
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.emitir_documento_impl(p_tipo, p_estudiante, p_anio, p_periodo);
$$;
revoke all on function public.emitir_documento(public.tipo_documento_oficial, uuid, uuid, uuid) from public, anon;
grant execute on function public.emitir_documento(public.tipo_documento_oficial, uuid, uuid, uuid) to authenticated, service_role;

-- ── Verificación de folio (datos mínimos). SECURITY INVOKER ────────────
create or replace function public.verificar_folio(p_folio text)
returns table (folio text, tipo public.tipo_documento_oficial, emitido date, valido boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.folio, d.tipo, d.created_at::date, true
  from public.documentos_emitidos d
  where d.folio = p_folio;
$$;
revoke all on function public.verificar_folio(text) from public, anon;
grant execute on function public.verificar_folio(text) to authenticated, service_role;

-- ── Boletín numérico: nota ponderada por asignatura y período ──────────
create or replace function public.boletin_numerico(p_estudiante uuid, p_anio uuid)
returns table (asignatura_id uuid, periodo_orden int, nota numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select cc.asignatura_id, per.orden,
    round(sum(cc.valor * pc.peso / 100), 2)
  from public.calificacion_componentes cc
  join public.ponderacion_componentes pc on pc.id = cc.componente_id
  join public.periodos per on per.id = cc.periodo_id
  where cc.estudiante_id = p_estudiante and per.anio_id = p_anio
  group by cc.asignatura_id, per.orden;
$$;
revoke all on function public.boletin_numerico(uuid, uuid) from public, anon;
grant execute on function public.boletin_numerico(uuid, uuid) to authenticated, service_role;

commit;
