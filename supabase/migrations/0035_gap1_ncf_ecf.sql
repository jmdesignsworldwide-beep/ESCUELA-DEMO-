-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · GAP 1 — NCF / e-CF real visible                        ║
-- ║  Aplicar vía Management API (PAT temporal).                          ║
-- ║                                                                        ║
-- ║  Comprobante Fiscal (NCF/e-CF) respaldado por SECUENCIAS AUTORIZADAS   ║
-- ║  por la DGII (rango + vencimiento), como en la realidad dominicana.   ║
-- ║  El recibo pasa a mostrar el comprobante fiscal completo. Educación =  ║
-- ║  servicio EXENTO de ITBIS. Sin tocar los pagos inmutables.            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Secuencias de comprobantes fiscales autorizadas ─────────────────────
create table if not exists public.secuencias_ncf (
  id               uuid primary key default gen_random_uuid(),
  sede_id          uuid not null references public.sedes(id) on delete cascade,
  tipo             text not null,           -- 'B01', 'E31', 'E32', ...
  descripcion      text not null,
  prefijo          text not null,
  secuencia_desde  bigint not null default 1,
  secuencia_hasta  bigint not null,
  vencimiento      date not null,
  electronico      boolean not null default false,
  activa           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (sede_id, tipo)
);

drop trigger if exists trg_secncf_updated on public.secuencias_ncf;
create trigger trg_secncf_updated
  before update on public.secuencias_ncf
  for each row execute function public.set_updated_at();

alter table public.secuencias_ncf enable row level security;
alter table public.secuencias_ncf force row level security;

drop policy if exists secncf_select on public.secuencias_ncf;
create policy secncf_select on public.secuencias_ncf
  for select to authenticated
  using (private.tiene_rol('director', 'contabilidad', 'coordinador'));
drop policy if exists secncf_write on public.secuencias_ncf;
create policy secncf_write on public.secuencias_ncf
  for all to authenticated
  using (private.tiene_rol('director', 'contabilidad'))
  with check (private.tiene_rol('director', 'contabilidad'));

-- ── RPC: estado de consumo de cada secuencia ────────────────────────────
create or replace function public.estado_secuencias_ncf()
returns table (
  tipo text, descripcion text, prefijo text, electronico boolean,
  desde bigint, hasta bigint, vencimiento date,
  usados bigint, disponibles bigint, vencida boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.tipo, s.descripcion, s.prefijo, s.electronico,
    s.secuencia_desde, s.secuencia_hasta, s.vencimiento,
    (select count(*) from public.pagos p where p.ncf like s.prefijo || '%'),
    (s.secuencia_hasta - s.secuencia_desde + 1)
      - (select count(*) from public.pagos p where p.ncf like s.prefijo || '%'),
    (s.vencimiento < current_date)
  from public.secuencias_ncf s
  where s.activa
  order by s.tipo;
$$;
revoke all on function public.estado_secuencias_ncf() from public, anon;
grant execute on function public.estado_secuencias_ncf() to authenticated, service_role;

-- ── RPC: comprobante fiscal de un recibo (para el documento) ────────────
--  Devuelve el vencimiento de la secuencia que respalda el NCF del pago.
create or replace function public.comprobante_secuencia(p_ncf text)
returns table (tipo text, descripcion text, vencimiento date, electronico boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.tipo, s.descripcion, s.vencimiento, s.electronico
  from public.secuencias_ncf s
  where p_ncf like s.prefijo || '%'
  order by length(s.prefijo) desc
  limit 1;
$$;
revoke all on function public.comprobante_secuencia(text) from public, anon;
grant execute on function public.comprobante_secuencia(text) to authenticated, service_role;

-- ── SEMILLA — secuencias autorizadas ────────────────────────────────────
do $$
declare v_sede uuid;
begin
  select id into v_sede from public.sedes order by created_at limit 1;
  if v_sede is null then return; end if;
  if exists (select 1 from public.secuencias_ncf where sede_id = v_sede) then
    return;
  end if;
  insert into public.secuencias_ncf
    (sede_id, tipo, descripcion, prefijo, secuencia_desde, secuencia_hasta,
     vencimiento, electronico)
  values
    (v_sede, 'B01', 'Crédito Fiscal', 'B01', 1, 50000000, date '2026-12-31', false),
    (v_sede, 'E31', 'Factura de Crédito Fiscal Electrónica (e-CF)', 'E31',
      1, 100000000, date '2027-12-31', true),
    (v_sede, 'E32', 'Factura de Consumo Electrónica (e-CF)', 'E32',
      1, 100000000, date '2027-12-31', true);
end $$;

commit;
