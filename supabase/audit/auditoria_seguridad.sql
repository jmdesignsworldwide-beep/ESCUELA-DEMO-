-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 22 — Auditoría de Seguridad (Fort Knox)         ║
-- ║  Consultas de SOLO LECTURA. Ejecutar vía Management API con PAT       ║
-- ║  temporal. No modifican datos ni esquema.                             ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── A. Tablas de public SIN RLS habilitado (debe ser 0) ────────────────
select relname as tabla_sin_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- ── B. Tablas con RLS pero SIN FORCE (debe ser 0) ──────────────────────
select relname as tabla_sin_force
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relrowsecurity and not c.relforcerowsecurity;

-- ── C. Resumen: tablas totales, con RLS, con FORCE ─────────────────────
select
  count(*) filter (where c.relkind = 'r') as tablas,
  count(*) filter (where c.relkind = 'r' and c.relrowsecurity) as con_rls,
  count(*) filter (where c.relkind = 'r' and c.relforcerowsecurity) as con_force
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public';

-- ── D. Funciones SECURITY DEFINER sin search_path fijo (debe ser 0) ────
select n.nspname as esquema, p.proname as funcion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prosecdef
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
    where cfg like 'search_path=%'
  );

-- ── E. Funciones con EXECUTE otorgado a anon (debe ser 0) ──────────────
select n.nspname as esquema, p.proname as funcion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and has_function_privilege('anon', p.oid, 'EXECUTE');

-- ── F. Tablas append-only: presencia de triggers de inmutabilidad ──────
-- Debe listar un trigger que impide UPDATE/DELETE en cada tabla inmutable.
select c.relname as tabla, count(t.tgname) as triggers_inmutables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_trigger t on t.tgrelid = c.oid
  and not t.tgisinternal
  and (t.tgname like '%no_update%' or t.tgname like '%inmutable%'
       or t.tgname like '%no_truncate%')
where n.nspname = 'public'
  and c.relname in ('bitacora', 'documentos_emitidos', 'pagos',
    'pago_aplicaciones', 'notas_credito', 'cierres_caja',
    'incidencias_disciplina')
group by c.relname
order by c.relname;

-- ── G. Tablas con RLS pero SIN políticas (deny-all; informativo) ───────
select c.relname as tabla_deny_all
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid)
order by c.relname;

-- ── H. Conteo de funciones SECURITY DEFINER por esquema ────────────────
select n.nspname as esquema, count(*) as definer_funcs
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and p.prosecdef
group by n.nspname order by n.nspname;
