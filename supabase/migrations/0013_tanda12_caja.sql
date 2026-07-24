-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 12 — Financiero: Caja y Cobros                   ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Pagos INMUTABLES con NCF simulado, aplicación a cargos, pagos        ║
-- ║  parciales, anulación por NOTA DE CRÉDITO (nunca borrar), y cierre    ║
-- ║  de caja con arqueo. RLS + FORCE.                                    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'metodo_pago') then
    create type public.metodo_pago as enum
      ('efectivo', 'transferencia', 'tarjeta', 'cheque');
  end if;
end $$;

create sequence if not exists public.ncf_seq;
create sequence if not exists public.recibo_seq;
grant usage, select on sequence public.ncf_seq, public.recibo_seq to authenticated, service_role;

create table if not exists public.pagos (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  recibo        text not null unique,
  ncf           text not null,
  estudiante_id uuid references public.estudiantes(id) on delete set null,
  familia_id    uuid references public.familias(id) on delete set null,
  metodo        public.metodo_pago not null,
  monto         numeric(10,2) not null check (monto > 0),
  referencia    text,
  cajero_id     uuid,
  cajero_email  text,
  fecha         date not null default current_date,
  created_at    timestamptz not null default now()
);

create table if not exists public.pago_aplicaciones (
  id        uuid primary key default gen_random_uuid(),
  pago_id   uuid not null references public.pagos(id) on delete cascade,
  cargo_id  uuid not null references public.cargos(id) on delete cascade,
  monto     numeric(10,2) not null check (monto > 0)
);

create table if not exists public.notas_credito (
  id         uuid primary key default gen_random_uuid(),
  pago_id    uuid not null unique references public.pagos(id) on delete cascade,
  motivo     text not null,
  monto      numeric(10,2) not null,
  creado_por uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.cierres_caja (
  id             uuid primary key default gen_random_uuid(),
  sede_id        uuid not null references public.sedes(id) on delete cascade,
  fecha          date not null,
  cajero_id      uuid,
  total_efectivo numeric(10,2) not null default 0,
  total_transferencia numeric(10,2) not null default 0,
  total_tarjeta  numeric(10,2) not null default 0,
  total_cheque   numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,
  num_pagos      int not null default 0,
  created_at     timestamptz not null default now(),
  unique (sede_id, fecha)
);

create index if not exists idx_pagos_fecha on public.pagos(fecha);
create index if not exists idx_pagos_fam on public.pagos(familia_id);
create index if not exists idx_pagoap_pago on public.pago_aplicaciones(pago_id);
create index if not exists idx_pagoap_cargo on public.pago_aplicaciones(cargo_id);

-- ── Inmutabilidad: pagos, aplicaciones, notas de crédito, cierres ──────
do $$
declare t text;
begin
  foreach t in array array['pagos','pago_aplicaciones','notas_credito','cierres_caja'] loop
    execute format('drop trigger if exists trg_%s_no_update on public.%I;', t, t);
    execute format(
      'create trigger trg_%s_no_update before update or delete on public.%I for each row execute function public.impedir_cambios();',
      t, t);
    execute format('drop trigger if exists trg_%s_no_truncate on public.%I;', t, t);
    execute format(
      'create trigger trg_%s_no_truncate before truncate on public.%I for each statement execute function public.impedir_cambios();',
      t, t);
  end loop;
end $$;

-- ── RLS (dirección/contabilidad) ────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['pagos','pago_aplicaciones','notas_credito','cierres_caja'] loop
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

-- ── RPC: registrar pago (transaccional, aplica a cargos) ───────────────
create or replace function public.registrar_pago(
  p_estudiante uuid,
  p_familia uuid,
  p_metodo public.metodo_pago,
  p_referencia text,
  p_aplicaciones jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sede uuid; v_pago uuid; v_ncf text; v_recibo text; v_total numeric := 0;
  a jsonb; v_cargo uuid; v_monto numeric; v_pagado numeric;
begin
  select id into v_sede from public.sedes where activa order by codigo limit 1;

  for a in select * from jsonb_array_elements(p_aplicaciones) loop
    v_total := v_total + (a ->> 'monto')::numeric;
  end loop;
  if v_total <= 0 then
    raise exception 'El pago debe ser mayor que cero.' using errcode = 'check_violation';
  end if;

  v_ncf := 'B01' || lpad(nextval('public.ncf_seq')::text, 8, '0');
  v_recibo := 'REC-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.recibo_seq')::text, 6, '0');

  insert into public.pagos
    (sede_id, recibo, ncf, estudiante_id, familia_id, metodo, monto, referencia, cajero_id, cajero_email)
  values (v_sede, v_recibo, v_ncf, p_estudiante, p_familia, p_metodo, v_total, p_referencia,
    (select auth.uid()), (select email from auth.users where id = (select auth.uid())))
  returning id into v_pago;

  for a in select * from jsonb_array_elements(p_aplicaciones) loop
    v_cargo := (a ->> 'cargo_id')::uuid;
    v_monto := (a ->> 'monto')::numeric;
    insert into public.pago_aplicaciones (pago_id, cargo_id, monto)
    values (v_pago, v_cargo, v_monto);

    select coalesce(sum(pa.monto), 0) into v_pagado
    from public.pago_aplicaciones pa
    join public.pagos pg on pg.id = pa.pago_id
    where pa.cargo_id = v_cargo
      and not exists (select 1 from public.notas_credito nc where nc.pago_id = pg.id);

    update public.cargos c
    set estado = (case
        when v_pagado >= c.monto then 'pagado'
        when v_pagado > 0 then 'parcial'
        else 'pendiente' end)::public.estado_cargo
    where c.id = v_cargo;
  end loop;

  perform private.registrar_bitacora('registro_pago', 'pagos', v_recibo,
    jsonb_build_object('monto', v_total, 'metodo', p_metodo));
  return v_recibo;
end;
$$;
revoke all on function public.registrar_pago(uuid, uuid, public.metodo_pago, text, jsonb) from public, anon;
grant execute on function public.registrar_pago(uuid, uuid, public.metodo_pago, text, jsonb) to authenticated, service_role;

-- ── RPC: anular pago con nota de crédito ───────────────────────────────
create or replace function public.anular_pago(p_pago uuid, p_motivo text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_monto numeric; v_cargo uuid; v_pagado numeric;
begin
  if not private.tiene_rol('director', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'El motivo de la nota de crédito es obligatorio.'
      using errcode = 'check_violation';
  end if;

  select monto into v_monto from public.pagos where id = p_pago;
  insert into public.notas_credito (pago_id, motivo, monto, creado_por)
  values (p_pago, p_motivo, v_monto, (select auth.uid()));

  for v_cargo in
    select cargo_id from public.pago_aplicaciones where pago_id = p_pago
  loop
    select coalesce(sum(pa.monto), 0) into v_pagado
    from public.pago_aplicaciones pa
    join public.pagos pg on pg.id = pa.pago_id
    where pa.cargo_id = v_cargo
      and not exists (select 1 from public.notas_credito nc where nc.pago_id = pg.id);

    update public.cargos c
    set estado = (case
        when v_pagado >= c.monto then 'pagado'
        when v_pagado > 0 then 'parcial'
        else 'pendiente' end)::public.estado_cargo
    where c.id = v_cargo;
  end loop;

  perform private.registrar_bitacora('anulacion_pago', 'pagos', p_pago::text,
    jsonb_build_object('motivo', p_motivo, 'monto', v_monto));
end;
$$;
revoke all on function public.anular_pago(uuid, text) from public, anon;
grant execute on function public.anular_pago(uuid, text) to authenticated, service_role;

-- ── RPC: cierre de caja diario (arqueo) ────────────────────────────────
create or replace function public.cerrar_caja(p_fecha date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_sede uuid; v_id uuid;
begin
  if not private.tiene_rol('director', 'contabilidad') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  select id into v_sede from public.sedes where activa order by codigo limit 1;

  insert into public.cierres_caja (
    sede_id, fecha, cajero_id, total_efectivo, total_transferencia,
    total_tarjeta, total_cheque, total, num_pagos)
  select v_sede, p_fecha, (select auth.uid()),
    coalesce(sum(monto) filter (where metodo = 'efectivo'), 0),
    coalesce(sum(monto) filter (where metodo = 'transferencia'), 0),
    coalesce(sum(monto) filter (where metodo = 'tarjeta'), 0),
    coalesce(sum(monto) filter (where metodo = 'cheque'), 0),
    coalesce(sum(monto), 0),
    count(*)
  from public.pagos p
  where p.fecha = p_fecha
    and not exists (select 1 from public.notas_credito nc where nc.pago_id = p.id)
  returning id into v_id;

  perform private.registrar_bitacora('cierre_caja', 'cierres_caja', v_id::text,
    jsonb_build_object('fecha', p_fecha));
  return v_id;
end;
$$;
revoke all on function public.cerrar_caja(date) from public, anon;
grant execute on function public.cerrar_caja(date) to authenticated, service_role;

-- ── RPC: saldo por cargo de un estudiante (para cobrar) ────────────────
create or replace function public.cargos_saldo(p_estudiante uuid)
returns table (
  cargo_id uuid, descripcion text, monto numeric, pagado numeric, saldo numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.descripcion, c.monto,
    coalesce((
      select sum(pa.monto) from public.pago_aplicaciones pa
      join public.pagos pg on pg.id = pa.pago_id
      where pa.cargo_id = c.id
        and not exists (select 1 from public.notas_credito nc where nc.pago_id = pg.id)
    ), 0) as pagado,
    c.monto - coalesce((
      select sum(pa.monto) from public.pago_aplicaciones pa
      join public.pagos pg on pg.id = pa.pago_id
      where pa.cargo_id = c.id
        and not exists (select 1 from public.notas_credito nc where nc.pago_id = pg.id)
    ), 0) as saldo
  from public.cargos c
  where c.estudiante_id = p_estudiante and c.estado in ('pendiente', 'parcial')
  order by c.vencimiento;
$$;
revoke all on function public.cargos_saldo(uuid) from public, anon;
grant execute on function public.cargos_saldo(uuid) to authenticated, service_role;

-- ── Semilla: pagos (al día y parciales) ────────────────────────────────
do $$
declare
  r record; v_sede uuid; v_pago uuid; v_metodos public.metodo_pago[] := array['efectivo','transferencia','tarjeta','cheque'];
begin
  if exists (select 1 from public.pagos limit 1) then
    return;
  end if;
  select id into v_sede from public.sedes where codigo = 'SEDE-01';

  -- Pago total de inscripción + agosto para ~45% de estudiantes.
  for r in
    select c.estudiante_id, c.familia_id, sum(c.monto) as total,
      array_agg(c.id) as cargos
    from public.cargos c
    where (c.mes is null or c.mes = 8)
      and (abs(hashtext(c.estudiante_id::text)) % 20) < 9
      and c.monto > 0
    group by c.estudiante_id, c.familia_id
  loop
    insert into public.pagos (sede_id, recibo, ncf, estudiante_id, familia_id, metodo, monto, fecha)
    values (v_sede,
      'REC-2026-' || lpad(nextval('public.recibo_seq')::text, 6, '0'),
      'B01' || lpad(nextval('public.ncf_seq')::text, 8, '0'),
      r.estudiante_id, r.familia_id,
      v_metodos[1 + abs(hashtext(r.estudiante_id::text)) % 4],
      r.total, date '2025-08-10')
    returning id into v_pago;

    insert into public.pago_aplicaciones (pago_id, cargo_id, monto)
    select v_pago, cid, (select monto from public.cargos where id = cid)
    from unnest(r.cargos) as cid;

    update public.cargos set estado = 'pagado' where id = any(r.cargos);
  end loop;

  -- Pago PARCIAL de inscripción para ~5% (deja el cargo en 'parcial').
  for r in
    select c.id as cargo_id, c.estudiante_id, c.familia_id, c.monto
    from public.cargos c
    where c.mes is null and c.estado = 'pendiente'
      and (abs(hashtext(c.estudiante_id::text)) % 20) = 12
      and c.monto > 0
    limit 15
  loop
    insert into public.pagos (sede_id, recibo, ncf, estudiante_id, familia_id, metodo, monto, fecha)
    values (v_sede,
      'REC-2026-' || lpad(nextval('public.recibo_seq')::text, 6, '0'),
      'B01' || lpad(nextval('public.ncf_seq')::text, 8, '0'),
      r.estudiante_id, r.familia_id, 'efectivo',
      round(r.monto / 2, 2), date '2025-08-15')
    returning id into v_pago;

    insert into public.pago_aplicaciones (pago_id, cargo_id, monto)
    values (v_pago, r.cargo_id, round(r.monto / 2, 2));

    update public.cargos set estado = 'parcial' where id = r.cargo_id;
  end loop;
end $$;

commit;
