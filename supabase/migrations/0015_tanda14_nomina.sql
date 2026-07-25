-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 14 — Nómina Docente                              ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Contratos con salario, configuración TSS/ISR (DGII) editable,        ║
-- ║  generación de nómina (AFP 2.87% / SFS 3.04% / ISR escalonado),      ║
-- ║  regalía pascual, cierre inmutable y volante de pago.                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_nomina') then
    create type public.tipo_nomina as enum ('ordinaria', 'regalia');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_nomina') then
    create type public.estado_nomina as enum ('borrador', 'cerrada');
  end if;
end $$;

-- ── Configuración de nómina (parámetros TSS + escala ISR DGII) ─────────
-- Valores por defecto = normativa vigente RD (editables por dirección).
create table if not exists public.config_nomina (
  id              uuid primary key default gen_random_uuid(),
  sede_id         uuid not null unique references public.sedes(id) on delete cascade,
  afp_pct         numeric(6,4) not null default 2.8700,   -- % empleado AFP
  sfs_pct         numeric(6,4) not null default 3.0400,   -- % empleado SFS
  tope_afp        numeric(12,2) not null default 405600,  -- 20 salarios mínimos cotizables
  tope_sfs        numeric(12,2) not null default 202800,  -- 10 salarios mínimos cotizables
  -- Escala ISR anual (DGII): tramos y montos fijos configurables.
  isr_exento      numeric(12,2) not null default 416220.00,
  isr_limite2     numeric(12,2) not null default 624329.00,
  isr_limite3     numeric(12,2) not null default 867123.00,
  isr_monto2      numeric(12,2) not null default 31216.00,
  isr_monto3      numeric(12,2) not null default 79776.00,
  isr_tasa1       numeric(6,4) not null default 15.0000,
  isr_tasa2       numeric(6,4) not null default 20.0000,
  isr_tasa3       numeric(6,4) not null default 25.0000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_config_nomina_updated_at on public.config_nomina;
create trigger trg_config_nomina_updated_at
  before update on public.config_nomina
  for each row execute function public.set_updated_at();

-- ── Contrato del empleado (salario mensual) ────────────────────────────
create table if not exists public.contratos_nomina (
  id            uuid primary key default gen_random_uuid(),
  empleado_id   uuid not null references public.empleados(id) on delete cascade,
  salario_base  numeric(12,2) not null check (salario_base >= 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Un solo contrato activo por empleado.
create unique index if not exists uidx_contrato_activo
  on public.contratos_nomina(empleado_id) where activo;

drop trigger if exists trg_contrato_updated_at on public.contratos_nomina;
create trigger trg_contrato_updated_at
  before update on public.contratos_nomina
  for each row execute function public.set_updated_at();

-- ── Nómina (período) ────────────────────────────────────────────────────
create table if not exists public.nominas (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  anio          int not null,
  mes           int not null check (mes between 1 and 12),
  tipo          public.tipo_nomina not null default 'ordinaria',
  estado        public.estado_nomina not null default 'borrador',
  cerrada_at    timestamptz,
  cerrada_por   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (sede_id, anio, mes, tipo)
);

-- ── Líneas de nómina (por empleado) ────────────────────────────────────
create table if not exists public.nomina_lineas (
  id                uuid primary key default gen_random_uuid(),
  nomina_id         uuid not null references public.nominas(id) on delete cascade,
  empleado_id       uuid not null references public.empleados(id) on delete cascade,
  salario_base      numeric(12,2) not null default 0,
  afp               numeric(12,2) not null default 0,
  sfs               numeric(12,2) not null default 0,
  isr               numeric(12,2) not null default 0,
  otros_ingresos    numeric(12,2) not null default 0,
  otras_deducciones numeric(12,2) not null default 0,
  total_ingresos    numeric(12,2) not null default 0,
  total_deducciones numeric(12,2) not null default 0,
  neto              numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  unique (nomina_id, empleado_id)
);

create index if not exists idx_nomlin_nomina on public.nomina_lineas(nomina_id);
create index if not exists idx_nomlin_emp on public.nomina_lineas(empleado_id);

-- ── Inmutabilidad: una nómina cerrada no se modifica ───────────────────
-- Bloquea UPDATE/DELETE de la cabecera cuando ya estaba 'cerrada'
-- (permite la transición borrador→cerrada vía cerrar_nomina()).
create or replace function private.bloquear_nomina_cerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.estado = 'cerrada'
     and coalesce(current_setting('app.permitir_cierre_nomina', true), '') <> 'on' then
    raise exception 'Nómina cerrada: es inmutable.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_nomina_inmutable on public.nominas;
create trigger trg_nomina_inmutable
  before update or delete on public.nominas
  for each row execute function private.bloquear_nomina_cerrada();

-- Bloquea escritura de líneas si su nómina padre está cerrada.
create or replace function private.bloquear_linea_cerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_estado public.estado_nomina;
begin
  select estado into v_estado from public.nominas
    where id = coalesce(new.nomina_id, old.nomina_id);
  if coalesce(v_estado, 'borrador') = 'cerrada' then
    raise exception 'Nómina cerrada: las líneas son inmutables.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_linea_inmutable on public.nomina_lineas;
create trigger trg_linea_inmutable
  before insert or update or delete on public.nomina_lineas
  for each row execute function private.bloquear_linea_cerrada();

-- ── RLS + FORCE (nómina = dirección/contabilidad únicamente) ───────────
do $$
declare t text;
begin
  foreach t in array array['config_nomina','contratos_nomina','nominas','nomina_lineas'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.tiene_rol(''director'',''contabilidad''));',
      t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (private.tiene_rol(''director'',''contabilidad'')) with check (private.tiene_rol(''director'',''contabilidad''));',
      t, t);
  end loop;
end $$;

-- ── ISR anual escalonado (DGII) — SECURITY INVOKER, puro ───────────────
create or replace function public.calcular_isr_anual(p_base numeric, p_sede uuid)
returns numeric
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare c public.config_nomina;
begin
  select * into c from public.config_nomina where sede_id = p_sede;
  if not found then return 0; end if;
  if p_base <= c.isr_exento then
    return 0;
  elsif p_base <= c.isr_limite2 then
    return round((p_base - c.isr_exento) * c.isr_tasa1 / 100, 2);
  elsif p_base <= c.isr_limite3 then
    return round(c.isr_monto2 + (p_base - c.isr_limite2) * c.isr_tasa2 / 100, 2);
  else
    return round(c.isr_monto3 + (p_base - c.isr_limite3) * c.isr_tasa3 / 100, 2);
  end if;
end;
$$;
revoke all on function public.calcular_isr_anual(numeric, uuid) from public, anon;
grant execute on function public.calcular_isr_anual(numeric, uuid) to authenticated, service_role;

-- ── Generar/recalcular una nómina en borrador ──────────────────────────
-- Repuebla las líneas desde los contratos activos aplicando TSS + ISR.
-- Regalía pascual: exenta de TSS e ISR (bonificación navideña 13.º).
create or replace function public.generar_nomina(p_nomina uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nom public.nominas;
  v_sede uuid;
  v_afp_pct numeric; v_sfs_pct numeric; v_tope_afp numeric; v_tope_sfs numeric;
  r record;
  v_afp numeric; v_sfs numeric; v_isr numeric; v_ded numeric; v_count int := 0;
begin
  select * into v_nom from public.nominas where id = p_nomina;
  if not found then raise exception 'Nómina no encontrada.'; end if;
  if v_nom.estado = 'cerrada' then
    raise exception 'La nómina está cerrada; no puede recalcularse.'
      using errcode = 'insufficient_privilege';
  end if;
  v_sede := v_nom.sede_id;

  select afp_pct, sfs_pct, tope_afp, tope_sfs
    into v_afp_pct, v_sfs_pct, v_tope_afp, v_tope_sfs
    from public.config_nomina where sede_id = v_sede;
  if not found then raise exception 'Falta configurar la nómina de la sede.'; end if;

  delete from public.nomina_lineas where nomina_id = p_nomina;

  for r in
    select c.empleado_id, c.salario_base
    from public.contratos_nomina c
    join public.empleados e on e.id = c.empleado_id
    where c.activo and e.sede_id = v_sede and e.estado = 'activo'
  loop
    if v_nom.tipo = 'regalia' then
      -- Regalía = 1/12 del salario anual ordinario ≈ un salario base.
      -- Exenta de TSS; ISR sobre regalía = 0 en este demo.
      v_afp := 0; v_sfs := 0; v_isr := 0;
      insert into public.nomina_lineas (
        nomina_id, empleado_id, salario_base, afp, sfs, isr,
        total_ingresos, total_deducciones, neto)
      values (p_nomina, r.empleado_id, r.salario_base, 0, 0, 0,
        r.salario_base, 0, r.salario_base);
    else
      v_afp := round(least(r.salario_base, v_tope_afp) * v_afp_pct / 100, 2);
      v_sfs := round(least(r.salario_base, v_tope_sfs) * v_sfs_pct / 100, 2);
      -- Base ISR = salario menos TSS, anualizado.
      v_isr := round(
        public.calcular_isr_anual((r.salario_base - v_afp - v_sfs) * 12, v_sede) / 12,
        2);
      v_ded := v_afp + v_sfs + v_isr;
      insert into public.nomina_lineas (
        nomina_id, empleado_id, salario_base, afp, sfs, isr,
        total_ingresos, total_deducciones, neto)
      values (p_nomina, r.empleado_id, r.salario_base, v_afp, v_sfs, v_isr,
        r.salario_base, v_ded, r.salario_base - v_ded);
    end if;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
revoke all on function public.generar_nomina(uuid) from public, anon;
grant execute on function public.generar_nomina(uuid) to authenticated, service_role;

-- ── Cerrar nómina (inmutable, con bitácora) ────────────────────────────
create or replace function public.cerrar_nomina(p_nomina uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_estado public.estado_nomina; v_lineas int;
begin
  select estado into v_estado from public.nominas where id = p_nomina;
  if v_estado is null then raise exception 'Nómina no encontrada.'; end if;
  if v_estado = 'cerrada' then raise exception 'La nómina ya está cerrada.'; end if;
  select count(*) into v_lineas from public.nomina_lineas where nomina_id = p_nomina;
  if v_lineas = 0 then raise exception 'No se puede cerrar una nómina sin líneas.'; end if;

  perform set_config('app.permitir_cierre_nomina', 'on', true);
  update public.nominas
    set estado = 'cerrada', cerrada_at = now(), cerrada_por = auth.uid()
    where id = p_nomina;
  perform set_config('app.permitir_cierre_nomina', 'off', true);

  perform private.registrar_bitacora(
    'cerrar_nomina', 'nominas', p_nomina::text,
    jsonb_build_object('lineas', v_lineas));
end;
$$;
revoke all on function public.cerrar_nomina(uuid) from public, anon;
grant execute on function public.cerrar_nomina(uuid) to authenticated, service_role;

-- ── RPC: resumen (totales) de una nómina ───────────────────────────────
create or replace function public.resumen_nomina(p_nomina uuid)
returns table (
  empleados bigint, total_bruto numeric, total_afp numeric,
  total_sfs numeric, total_isr numeric, total_neto numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*), coalesce(sum(total_ingresos), 0), coalesce(sum(afp), 0),
    coalesce(sum(sfs), 0), coalesce(sum(isr), 0), coalesce(sum(neto), 0)
  from public.nomina_lineas where nomina_id = p_nomina;
$$;
revoke all on function public.resumen_nomina(uuid) from public, anon;
grant execute on function public.resumen_nomina(uuid) to authenticated, service_role;

-- ── Semilla ─────────────────────────────────────────────────────────────
do $$
declare
  v_sede uuid;
  v_nom uuid;
  v_cnt int;
begin
  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  if v_sede is null then return; end if;

  -- Configuración de nómina (idempotente).
  insert into public.config_nomina (sede_id) values (v_sede)
  on conflict (sede_id) do nothing;

  -- Contratos por tipo de empleado (salarios de ejemplo, RD$).
  insert into public.contratos_nomina (empleado_id, salario_base)
  select e.id,
    case e.tipo
      when 'directivo'      then 95000
      when 'docente'        then 48000
      when 'administrativo' then 34000
      else 22000
    end
  from public.empleados e
  where e.sede_id = v_sede and e.estado = 'activo'
    and not exists (
      select 1 from public.contratos_nomina c
      where c.empleado_id = e.id and c.activo);

  -- Nómina ordinaria de ejemplo (junio) ya cerrada, para mostrar datos.
  insert into public.nominas (sede_id, anio, mes, tipo, estado)
  values (v_sede, 2026, 6, 'ordinaria', 'borrador')
  on conflict (sede_id, anio, mes, tipo) do nothing
  returning id into v_nom;

  if v_nom is not null then
    v_cnt := public.generar_nomina(v_nom);
    if v_cnt > 0 then
      perform public.cerrar_nomina(v_nom);
    end if;
  end if;
end $$;

commit;
