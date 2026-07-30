-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA F — Documentos oficiales MINERD + verificación    ║
-- ║  pública. Aplicar vía Management API (PAT temporal).                  ║
-- ║                                                                        ║
-- ║  · Nuevo tipo: carta_conclusion_primaria.                             ║
-- ║  · Verificación de folio PÚBLICA REAL: cualquiera (sin login) puede    ║
-- ║    comprobar la autenticidad de un folio, viendo sólo datos mínimos    ║
-- ║    (folio, tipo, fecha, iniciales) — nunca información sensible.       ║
-- ║  Sin tablas nuevas. El récord MINERD reusa boletin_numerico.          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Nuevo tipo de documento (fuera de transacción: no se usa en la misma tx).
alter type public.tipo_documento_oficial
  add value if not exists 'carta_conclusion_primaria';

begin;

-- ══════════════════════════════════════════════════════════════════════
--  Verificación de folio PÚBLICA (rol anon). SECURITY DEFINER para poder
--  leer bajo RLS, pero devuelve SÓLO datos no sensibles. Concedida a anon
--  (no a authenticated → no dispara el lint de DEFINER ejecutable).
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.verificar_folio_publico(p_folio text)
returns table (
  existe boolean,
  folio text,
  tipo text,
  emitido date,
  estudiante_iniciales text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select true,
    d.folio,
    d.tipo::text,
    d.created_at::date,
    upper(left(coalesce(e.nombres, ''), 1) || left(coalesce(e.apellidos, ''), 1))
  from public.documentos_emitidos d
  left join public.estudiantes e on e.id = d.estudiante_id
  where d.folio = upper(trim(p_folio));

  if not found then
    return query select false, upper(trim(p_folio)), null::text, null::date, null::text;
  end if;
end;
$$;
revoke all on function public.verificar_folio_publico(text) from public, authenticated;
grant execute on function public.verificar_folio_publico(text) to anon, service_role;

commit;
