-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 13 — Morosidad y Cobranza                       ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Antigüedad de saldo (30/60/90+), mora automática, BLOQUEO POR        ║
-- ║  MOROSIDAD VALIDADO EN SERVIDOR, y proyección de ingresos.           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

alter table public.config_financiera
  add column if not exists bloqueo_por_morosidad boolean not null default false;
alter table public.config_financiera
  add column if not exists dias_gracia int not null default 15;

-- ── RPC: panel de morosidad por familia (antigüedad + mora) ────────────
create or replace function public.panel_morosidad()
returns table (
  familia_id uuid, apellido text, saldo numeric,
  b_0_30 numeric, b_31_60 numeric, b_61_90 numeric, b_90mas numeric,
  dias_max int, cargos_vencidos bigint, mora numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with saldos as (
    select c.familia_id, c.vencimiento,
      c.monto - coalesce((
        select sum(pa.monto) from public.pago_aplicaciones pa
        join public.pagos pg on pg.id = pa.pago_id
        where pa.cargo_id = c.id
          and not exists (select 1 from public.notas_credito nc where nc.pago_id = pg.id)
      ), 0) as saldo
    from public.cargos c
    where c.estado in ('pendiente', 'parcial')
      and c.vencimiento is not null and c.vencimiento < current_date
  ),
  pf as (
    select familia_id,
      sum(saldo) as saldo,
      sum(saldo) filter (where current_date - vencimiento <= 30) as b1,
      sum(saldo) filter (where current_date - vencimiento between 31 and 60) as b2,
      sum(saldo) filter (where current_date - vencimiento between 61 and 90) as b3,
      sum(saldo) filter (where current_date - vencimiento > 90) as b4,
      max(current_date - vencimiento) as dias_max,
      count(*) as vencidos
    from saldos group by familia_id
  )
  select pf.familia_id, f.apellido_familiar, pf.saldo,
    coalesce(pf.b1, 0), coalesce(pf.b2, 0), coalesce(pf.b3, 0), coalesce(pf.b4, 0),
    pf.dias_max, pf.vencidos,
    pf.vencidos * coalesce((select mora_monto from public.config_financiera limit 1), 0)
  from pf join public.familias f on f.id = pf.familia_id
  where pf.saldo > 0;
$$;
revoke all on function public.panel_morosidad() from public, anon;
grant execute on function public.panel_morosidad() to authenticated, service_role;

-- ── RPC: proyección de ingresos de un mes ──────────────────────────────
create or replace function public.proyeccion_mes(p_mes int)
returns table (esperado numeric, cobrado numeric, pendiente numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(monto), 0),
    coalesce(sum(monto) filter (where estado = 'pagado'), 0),
    coalesce(sum(monto) filter (where estado in ('pendiente', 'parcial')), 0)
  from public.cargos where mes = p_mes and estado <> 'anulado';
$$;
revoke all on function public.proyeccion_mes(int) from public, anon;
grant execute on function public.proyeccion_mes(int) to authenticated, service_role;

-- ── Bloqueo por morosidad VALIDADO EN SERVIDOR ─────────────────────────
create or replace function private.morosidad_bloquea(p_estudiante uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select bloqueo_por_morosidad from public.config_financiera limit 1), false)
    and exists (
      select 1 from public.cargos c
      where c.estudiante_id = p_estudiante
        and c.estado in ('pendiente', 'parcial')
        and c.vencimiento is not null
        and c.vencimiento < current_date
          - coalesce((select dias_gracia from public.config_financiera limit 1), 15)
    );
$$;
revoke all on function private.morosidad_bloquea(uuid) from public;
grant execute on function private.morosidad_bloquea(uuid) to authenticated, service_role;

commit;
