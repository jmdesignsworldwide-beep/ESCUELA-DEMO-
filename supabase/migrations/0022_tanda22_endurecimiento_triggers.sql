-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 22 — Endurecimiento final (auditoría)           ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  La auditoría detectó que algunas funciones de trigger conservaban    ║
-- ║  el EXECUTE por defecto de PUBLIC/anon. Aunque son inalcanzables vía  ║
-- ║  API (esquema private no expuesto y son returns trigger), Fort Knox   ║
-- ║  exige revocar EXECUTE de public/anon/authenticated. Los triggers     ║
-- ║  siguen disparando (no requieren EXECUTE del rol invocante).          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

do $$
declare f text;
begin
  foreach f in array array[
    'private.validar_suma_ponderacion()',
    'private.bloquear_asistencia_cerrada()',
    'private.bloquear_reapertura()',
    'private.bloquear_calif_cerrada()',
    'private.bloquear_nomina_cerrada()',
    'private.bloquear_linea_cerrada()',
    'private.bloquear_circular_publicada()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated;', f);
  end loop;
end $$;

commit;
