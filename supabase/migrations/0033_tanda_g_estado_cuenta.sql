-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA G — Estado de cuenta POR FAMILIA (buscable)       ║
-- ║  Aplicar vía Management API (PAT temporal).                          ║
-- ║                                                                        ║
-- ║  Corrige el "todos los padres revueltos": un resumen consolidado por  ║
-- ║  FAMILIA con estudiantes, neto, descuentos (hermanos/becas),          ║
-- ║  pendiente, vencido, días de mora y TRAMO de antigüedad — para        ║
-- ║  búsqueda con autocompletado y filtros por tramo. INVOKER (la RLS de  ║
-- ║  cargos ya restringe a dirección/contabilidad). Sin tablas nuevas.    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

create or replace function public.estado_cuenta_familias()
returns table (
  familia_id uuid,
  apellido text,
  estudiantes bigint,
  total_neto numeric,
  total_descuento numeric,
  pendiente numeric,
  vencido numeric,
  dias_max int,
  tramo text)
language sql
stable
security invoker
set search_path = ''
as $$
  with cg as (
    select c.familia_id,
      sum(c.monto) as neto,
      sum(c.descuento) as descuento,
      sum(c.monto) filter (where c.estado in ('pendiente', 'parcial')) as pendiente,
      sum(c.monto) filter (
        where c.estado in ('pendiente', 'parcial')
          and c.vencimiento is not null and c.vencimiento < current_date) as vencido,
      max(case
        when c.estado in ('pendiente', 'parcial')
          and c.vencimiento is not null and c.vencimiento < current_date
        then (current_date - c.vencimiento) end) as dias_max
    from public.cargos c
    where c.estado <> 'anulado' and c.familia_id is not null
    group by c.familia_id
  )
  select f.id, f.apellido_familiar,
    (select count(*) from public.estudiantes e
      where e.familia_id = f.id and e.estado = 'activo'),
    coalesce(cg.neto, 0),
    coalesce(cg.descuento, 0),
    coalesce(cg.pendiente, 0),
    coalesce(cg.vencido, 0),
    cg.dias_max,
    (case
      when coalesce(cg.dias_max, 0) <= 0 then 'al_dia'
      when cg.dias_max <= 30 then 't_0_30'
      when cg.dias_max <= 60 then 't_31_60'
      when cg.dias_max <= 90 then 't_61_90'
      else 't_90mas' end)
  from public.familias f
  join cg on cg.familia_id = f.id
  where coalesce(cg.neto, 0) > 0
  order by coalesce(cg.pendiente, 0) desc, f.apellido_familiar;
$$;
revoke all on function public.estado_cuenta_familias() from public, anon;
grant execute on function public.estado_cuenta_familias() to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  SEMILLA — variedad de antigüedad (aging) para el filtro por tramo.
--  La semilla original sólo tenía ago–nov 2025 (todo > 90 días hoy).
--  Genera mensualidades recientes (may/jun/jul 2026) y reparte las
--  familias en tramos pagando selectivamente. Idempotente.
-- ══════════════════════════════════════════════════════════════════════
do $$
declare v_anio uuid;
begin
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';
  if v_anio is null then return; end if;

  -- Mensualidades recientes (con descuento por hermanos/becas aplicado).
  perform public.generar_cargos_mensualidad(v_anio, 5);
  perform public.generar_cargos_mensualidad(v_anio, 6);
  perform public.generar_cargos_mensualidad(v_anio, 7);

  -- Reparte por hash de familia (idempotente):
  --  A(0-2 ≈30%): al día · B(3-4): 0-30 · C(5-6): 31-60 · D(7): 61-90 · E(8-9): +90
  -- A: paga todo lo pendiente.
  update public.cargos set estado = 'pagado'
  where estado in ('pendiente', 'parcial')
    and familia_id in (select id from public.familias
      where abs(hashtext(id::text)) % 10 in (0, 1, 2));
  -- B: paga todo excepto julio (mes 7).
  update public.cargos set estado = 'pagado'
  where estado in ('pendiente', 'parcial') and mes <> 7
    and familia_id in (select id from public.familias
      where abs(hashtext(id::text)) % 10 in (3, 4));
  -- C: paga todo excepto junio y julio.
  update public.cargos set estado = 'pagado'
  where estado in ('pendiente', 'parcial') and mes not in (6, 7)
    and familia_id in (select id from public.familias
      where abs(hashtext(id::text)) % 10 in (5, 6));
  -- D: paga todo excepto mayo, junio y julio.
  update public.cargos set estado = 'pagado'
  where estado in ('pendiente', 'parcial') and mes not in (5, 6, 7)
    and familia_id in (select id from public.familias
      where abs(hashtext(id::text)) % 10 = 7);
  -- E: sin cambios (mantiene el saldo antiguo → +90 días).
end $$;

commit;
