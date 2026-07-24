-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 11 — Financiero: Configuración y Facturación     ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Conceptos de cobro, config (mensualidades, descuento por hermanos),  ║
-- ║  becas, y cargos con DESCUENTO POR HERMANOS AUTOMÁTICO. Estado de     ║
-- ║  cuenta por familia. RD$. RLS + FORCE.                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_concepto') then
    create type public.tipo_concepto as enum
      ('inscripcion', 'mensualidad', 'uniforme', 'transporte', 'excursion', 'otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_beca') then
    create type public.tipo_beca as enum ('completa', 'media', 'porcentaje');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_cargo') then
    create type public.estado_cargo as enum ('pendiente', 'pagado', 'parcial', 'anulado');
  end if;
end $$;

create table if not exists public.config_financiera (
  id                uuid primary key default gen_random_uuid(),
  sede_id           uuid not null unique references public.sedes(id) on delete cascade,
  moneda            text not null default 'RD$',
  num_mensualidades int not null default 10,
  dia_vencimiento   int not null default 5,
  desc_2do          numeric(5,2) not null default 10,
  desc_3ro          numeric(5,2) not null default 15,
  desc_4to          numeric(5,2) not null default 20,
  mora_monto        numeric(10,2) not null default 500,
  mora_dia          int not null default 10,
  created_at        timestamptz not null default now()
);

create table if not exists public.conceptos_cobro (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  codigo     text not null,
  nombre     text not null,
  tipo       public.tipo_concepto not null,
  monto      numeric(10,2) not null default 0,
  recurrente boolean not null default false,
  orden      int not null default 0,
  activo     boolean not null default true,
  unique (sede_id, codigo)
);

create table if not exists public.becas (
  id            uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null unique references public.estudiantes(id) on delete cascade,
  tipo          public.tipo_beca not null,
  porcentaje    numeric(5,2) not null check (porcentaje >= 0 and porcentaje <= 100),
  motivo        text,
  activa        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.cargos (
  id            uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  familia_id    uuid references public.familias(id) on delete set null,
  concepto_id   uuid references public.conceptos_cobro(id) on delete set null,
  anio_id       uuid references public.anios_escolares(id) on delete set null,
  descripcion   text not null,
  mes           int,
  monto_base    numeric(10,2) not null,
  descuento     numeric(10,2) not null default 0,
  monto         numeric(10,2) generated always as (monto_base - descuento) stored,
  vencimiento   date,
  estado        public.estado_cargo not null default 'pendiente',
  created_at    timestamptz not null default now()
);

create index if not exists idx_cargos_est on public.cargos(estudiante_id);
create index if not exists idx_cargos_fam on public.cargos(familia_id);
create index if not exists idx_cargos_estado on public.cargos(estado);

-- ── RLS (financiero: dirección/contabilidad escriben; coordinación lee) ─
do $$
declare t text;
begin
  foreach t in array array['config_financiera','conceptos_cobro','becas','cargos'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.tiene_rol(''director'',''contabilidad'',''coordinador''));',
      t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (private.tiene_rol(''director'',''contabilidad'')) with check (private.tiene_rol(''director'',''contabilidad''));',
      t, t);
  end loop;
end $$;

-- ── RPC: estado de cuenta consolidado por familia ──────────────────────
create or replace function public.estado_cuenta_familia(p_familia uuid)
returns table (
  estudiante_id uuid, total_base numeric, total_descuento numeric,
  total_neto numeric, total_pendiente numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.estudiante_id,
    coalesce(sum(c.monto_base), 0),
    coalesce(sum(c.descuento), 0),
    coalesce(sum(c.monto), 0),
    coalesce(sum(c.monto) filter (where c.estado in ('pendiente', 'parcial')), 0)
  from public.cargos c
  where c.familia_id = p_familia and c.estado <> 'anulado'
  group by c.estudiante_id;
$$;
revoke all on function public.estado_cuenta_familia(uuid) from public, anon;
grant execute on function public.estado_cuenta_familia(uuid) to authenticated, service_role;

-- Resumen de familias con saldo (para el listado de estado de cuenta).
create or replace function public.resumen_familias()
returns table (
  familia_id uuid, apellido text, estudiantes bigint,
  total_neto numeric, pendiente numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.id, f.apellido_familiar,
    (select count(*) from public.estudiantes e
      where e.familia_id = f.id and e.estado = 'activo'),
    coalesce(sum(c.monto), 0),
    coalesce(sum(c.monto) filter (where c.estado in ('pendiente', 'parcial')), 0)
  from public.familias f
  left join public.cargos c on c.familia_id = f.id and c.estado <> 'anulado'
  group by f.id, f.apellido_familiar
  having coalesce(sum(c.monto), 0) > 0;
$$;
revoke all on function public.resumen_familias() from public, anon;
grant execute on function public.resumen_familias() to authenticated, service_role;

-- ── RPC: generación masiva de mensualidad (descuentos automáticos) ─────
create or replace function public.generar_cargos_mensualidad(p_anio uuid, p_mes int)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sede uuid; v_concepto uuid; v_monto numeric;
  v_dia int; v_d2 numeric; v_d3 numeric; v_d4 numeric; v_count int;
begin
  select id into v_sede from public.sedes where activa order by codigo limit 1;
  select id, monto into v_concepto, v_monto
    from public.conceptos_cobro where sede_id = v_sede and codigo = 'MENS';
  select dia_vencimiento, desc_2do, desc_3ro, desc_4to
    into v_dia, v_d2, v_d3, v_d4
    from public.config_financiera where sede_id = v_sede;

  with desc_cte as (
    select o.estudiante_id, o.familia_id,
      coalesce(
        (select case b.tipo when 'completa' then 100 when 'media' then 50 else b.porcentaje end
         from public.becas b where b.estudiante_id = o.estudiante_id and b.activa),
        case o.orden when 1 then 0 when 2 then v_d2 when 3 then v_d3 else v_d4 end
      ) as efectivo
    from (
      select e.id as estudiante_id, e.familia_id,
        row_number() over (partition by e.familia_id order by e.fecha_nacimiento) as orden
      from public.estudiantes e where e.estado = 'activo'
    ) o
  )
  insert into public.cargos (estudiante_id, familia_id, concepto_id, anio_id, descripcion, mes, monto_base, descuento, vencimiento, estado)
  select d.estudiante_id, d.familia_id, v_concepto, p_anio,
    'Mensualidad mes ' || p_mes, p_mes, v_monto,
    round(v_monto * d.efectivo / 100, 2),
    make_date(case when p_mes >= 8 then 2025 else 2026 end, p_mes, v_dia),
    'pendiente'
  from desc_cte d
  where not exists (
    select 1 from public.cargos c
    where c.estudiante_id = d.estudiante_id and c.concepto_id = v_concepto
      and c.mes = p_mes and c.anio_id = p_anio);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.generar_cargos_mensualidad(uuid, integer) from public, anon;
grant execute on function public.generar_cargos_mensualidad(uuid, integer) to authenticated, service_role;

-- ── Semilla ─────────────────────────────────────────────────────────────
do $$
declare
  v_sede uuid;
  v_anio uuid;
  v_d2 numeric; v_d3 numeric; v_d4 numeric; v_dia int;
begin
  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  insert into public.config_financiera (sede_id) values (v_sede)
  on conflict (sede_id) do nothing;
  select desc_2do, desc_3ro, desc_4to, dia_vencimiento
    into v_d2, v_d3, v_d4, v_dia
  from public.config_financiera where sede_id = v_sede;

  insert into public.conceptos_cobro (sede_id, codigo, nombre, tipo, monto, recurrente, orden)
  values
    (v_sede, 'INSC', 'Inscripción anual', 'inscripcion', 8500, false, 1),
    (v_sede, 'MENS', 'Mensualidad', 'mensualidad', 4500, true, 2),
    (v_sede, 'UNIF', 'Uniforme escolar', 'uniforme', 3200, false, 3),
    (v_sede, 'TRAN', 'Transporte', 'transporte', 2500, true, 4),
    (v_sede, 'EXCU', 'Excursión', 'excursion', 1500, false, 5)
  on conflict (sede_id, codigo) do nothing;

  if exists (select 1 from public.cargos limit 1) then
    return;
  end if;

  -- Becas de ejemplo (algunos estudiantes).
  insert into public.becas (estudiante_id, tipo, porcentaje, motivo)
  select id,
    (case (row_number() over (order by codigo)) % 3
       when 0 then 'completa' when 1 then 'media' else 'porcentaje' end)::public.tipo_beca,
    (case (row_number() over (order by codigo)) % 3
       when 0 then 100 when 1 then 50 else 30 end)::numeric,
    'Beca por mérito / condición socioeconómica'
  from public.estudiantes
  where estado = 'activo' and codigo in ('EST-0005', 'EST-0021', 'EST-0044', 'EST-0060', 'EST-0090', 'EST-0120')
  on conflict (estudiante_id) do nothing;

  -- Órdenes de hermano y descuento efectivo por estudiante.
  create temporary table _desc on commit drop as
  with ordenes as (
    select e.id as estudiante_id, e.familia_id,
      row_number() over (partition by e.familia_id order by e.fecha_nacimiento) as orden
    from public.estudiantes e
    where e.estado = 'activo'
  )
  select o.estudiante_id, o.familia_id,
    coalesce(
      (select case b.tipo when 'completa' then 100 when 'media' then 50 else b.porcentaje end
       from public.becas b where b.estudiante_id = o.estudiante_id and b.activa),
      case o.orden when 1 then 0 when 2 then v_d2 when 3 then v_d3 else v_d4 end
    ) as efectivo
  from ordenes o;

  -- Inscripción (1 por estudiante).
  insert into public.cargos (estudiante_id, familia_id, concepto_id, anio_id, descripcion, mes, monto_base, descuento, vencimiento, estado)
  select d.estudiante_id, d.familia_id, c.id, v_anio, 'Inscripción 2025–2026', null,
    c.monto, round(c.monto * d.efectivo / 100, 2), date '2025-08-05', 'pendiente'
  from _desc d
  cross join public.conceptos_cobro c
  where c.sede_id = v_sede and c.codigo = 'INSC';

  -- Mensualidades agosto–noviembre (para poblar estado de cuenta).
  insert into public.cargos (estudiante_id, familia_id, concepto_id, anio_id, descripcion, mes, monto_base, descuento, vencimiento, estado)
  select d.estudiante_id, d.familia_id, c.id, v_anio,
    'Mensualidad ' || m.nombre, m.mes,
    c.monto, round(c.monto * d.efectivo / 100, 2),
    make_date(2025, m.mes, v_dia), 'pendiente'
  from _desc d
  cross join public.conceptos_cobro c
  cross join (values (8, 'Agosto'), (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'))
    as m(mes, nombre)
  where c.sede_id = v_sede and c.codigo = 'MENS';
end $$;

commit;
