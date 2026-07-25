-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 20 — Ajustes y Bitácora de Auditoría            ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Configuración institucional editable (identidad del colegio) y       ║
-- ║  soporte para el visor de la bitácora inmutable (solo dirección).     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Configuración institucional (identidad del colegio) ────────────────
create table if not exists public.config_institucional (
  id             uuid primary key default gen_random_uuid(),
  sede_id        uuid not null unique references public.sedes(id) on delete cascade,
  nombre         text not null,
  siglas         text,
  ciudad         text,
  pais           text not null default 'República Dominicana',
  direccion      text,
  telefono       text,
  email          text,
  rnc            text,
  director_nombre text,
  lema           text,
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_config_inst_updated_at on public.config_institucional;
create trigger trg_config_inst_updated_at
  before update on public.config_institucional
  for each row execute function public.set_updated_at();

-- ── RLS (dirección edita; staff puede leer la identidad institucional) ─
alter table public.config_institucional enable row level security;
alter table public.config_institucional force row level security;
drop policy if exists config_inst_select on public.config_institucional;
create policy config_inst_select on public.config_institucional
  for select to authenticated using (true);
drop policy if exists config_inst_write on public.config_institucional;
create policy config_inst_write on public.config_institucional
  for all to authenticated
  using (private.tiene_rol('director'))
  with check (private.tiene_rol('director'));

-- ── RPC: acciones distintas registradas (para el filtro del visor) ─────
create or replace function private.bitacora_acciones()
returns table (accion text, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.tiene_rol('director') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select b.accion, count(*)
    from public.bitacora b
    group by b.accion
    order by count(*) desc;
end;
$$;
revoke all on function private.bitacora_acciones() from public, anon;
grant execute on function private.bitacora_acciones() to authenticated, service_role;

create or replace function public.bitacora_acciones()
returns table (accion text, total bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.bitacora_acciones(); $$;
revoke all on function public.bitacora_acciones() from public, anon;
grant execute on function public.bitacora_acciones() to authenticated, service_role;

-- ── Semilla: identidad del colegio demo ────────────────────────────────
do $$
declare v_sede uuid;
begin
  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  if v_sede is null then return; end if;

  insert into public.config_institucional
    (sede_id, nombre, siglas, ciudad, pais, direccion, telefono, email, rnc, director_nombre, lema)
  values
    (v_sede, 'Colegio San Rafael Arcángel', 'CSRA', 'Santiago de los Caballeros',
     'República Dominicana', 'Av. Estrella Sadhalá #45, Santiago',
     '(809) 555-0123', 'info@csra.edu.do', '1-01-00000-0',
     'Dra. Altagracia Fernández', 'Formando con excelencia y valores')
  on conflict (sede_id) do nothing;
end $$;

commit;
