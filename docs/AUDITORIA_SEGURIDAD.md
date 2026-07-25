# Auditoría de Seguridad — JM ESCOLAR

**Sistema:** JM ESCOLAR — Gestión Académica Integral (demo comercial RD)
**Proyecto Supabase:** `vzfotzaumqnhjgckjxdt`
**Alcance:** esquema completo tras TANDA 22 (migraciones `0001`–`0022`)
**Método:** consultas de solo lectura sobre `pg_catalog` + Supabase Security Advisor, ejecutadas vía Management API con PAT temporal (revocado al terminar).
**Script reproducible:** [`supabase/audit/auditoria_seguridad.sql`](../supabase/audit/auditoria_seguridad.sql)

---

## Resultado ejecutivo

**APROBADO — postura Fort Knox verificada.** Un único hallazgo de defensa en profundidad (funciones de trigger con `EXECUTE` por defecto de `PUBLIC`) fue corregido en la migración `0022` y re-verificado. No quedan hallazgos abiertos salvo un aviso informativo de plan (HIBP), no accionable en el plan actual.

---

## Controles verificados

| # | Control | Esperado | Resultado |
|---|---------|----------|-----------|
| A | Tablas de `public` sin RLS | 0 | ✅ **0** |
| B | Tablas con RLS pero sin `FORCE` | 0 | ✅ **0** |
| C | Cobertura RLS + FORCE | 100 % | ✅ **52 / 52** tablas con RLS **y** FORCE |
| D | Funciones `SECURITY DEFINER` sin `search_path` fijo | 0 | ✅ **0** |
| E | Funciones con `EXECUTE` otorgado a `anon` | 0 | ✅ **0** (tras `0022`; eran 7 funciones de trigger) |
| F | Tablas append-only con triggers de inmutabilidad | todas | ✅ **7 / 7** con doble trigger (UPDATE/DELETE + TRUNCATE) |
| G | Tablas con RLS pero sin políticas (deny-all accidental) | 0 | ✅ **0** (todas con política explícita) |
| H | Distribución de `SECURITY DEFINER` | privilegio mínimo | ✅ 21 en `private` (privilegiadas, no expuestas) + 1 en `public` (`verificar_pin_docente`, solo `service_role`) |
| — | Supabase Security Advisor (seguridad) | limpio | ✅ Solo `auth_leaked_password_protection` (WARN) |

---

## Detalle de los pilares

### 1. Aislamiento de datos (RLS + FORCE)
Las **52 tablas** de `public` tienen Row Level Security **habilitado y forzado** (`FORCE`), de modo que ni el dueño de la tabla evade las políticas. Deny-all por defecto: ninguna tabla queda accesible sin una política que lo autorice explícitamente. `docente_pins` mantiene una política deny-all explícita (los PIN nunca se exponen; se validan por RPC `SECURITY DEFINER` que solo devuelve el correo).

### 2. Funciones privilegiadas
- Todas las funciones `SECURITY DEFINER` fijan `search_path = ''` (previene secuestro de search_path). **0 excepciones.**
- El patrón del portal/dashboard/comunicación es **lógica en `private` (DEFINER) + envoltorio `public` (INVOKER)**: PostgREST solo expone el envoltorio INVOKER, manteniendo el Security Advisor limpio y la lógica privilegiada fuera del alcance directo del cliente.
- La única función `SECURITY DEFINER` en `public` es `verificar_pin_docente`, con `EXECUTE` revocado de `public`/`anon`/`authenticated` y otorgado solo a `service_role`.

### 3. Enforcement en servidor
Toda validación de permiso/rol/pertenencia ocurre en servidor:
- `requireRole()` en cada página y server action (valida rol **y** estado activo contra la BD).
- Aislamiento hermético del portal: `private.mis_estudiantes()` + guardias `p_est ∈ mis_estudiantes` en cada RPC del portal → un tutor jamás ve datos de otra familia (verificado: ve 3 de 174; petición cruzada → `42501`).
- Bloqueo por morosidad validado en BD (`private.morosidad_bloquea`), no en el cliente.
- Zod en cada entrada de server action.

### 4. Inmutabilidad (append-only / registros cerrados)
Las 7 tablas críticas tienen triggers que **bloquean UPDATE/DELETE/TRUNCATE**: `bitacora`, `documentos_emitidos`, `pagos`, `pago_aplicaciones`, `notas_credito`, `cierres_caja`, `incidencias_disciplina`. Además, cierres condicionales (calificaciones, nómina, circulares) vuelven inmutables los registros una vez cerrados/publicados. Verificado: el `UPDATE` sobre `bitacora` sigue fallando (`42501`) incluso tras revocar `EXECUTE` de las funciones de trigger.

---

## Hallazgo y remediación

| Hallazgo | Severidad | Estado |
|----------|-----------|--------|
| 7 funciones de trigger en `private` conservaban el `EXECUTE` por defecto de `PUBLIC`/`anon` | **Baja** (defensa en profundidad; inalcanzables vía API: esquema `private` no expuesto por PostgREST y son `returns trigger`) | ✅ **Corregido** en `0022` — `REVOKE ALL ... FROM public, anon, authenticated`. Re-verificado E = 0. Los triggers siguen disparando (no requieren `EXECUTE` del rol invocante). |

## Aviso aceptado (no accionable)

| Aviso | Motivo |
|-------|--------|
| `auth_leaked_password_protection` (HIBP) | Requiere plan Supabase Pro; en el plan actual la API devuelve 402 al intentar habilitarlo. Documentado como esperado desde TANDA 1. |

---

## Conclusión

El sistema cumple la política **Fort Knox** definida en el prompt maestro: RLS+FORCE universal con deny-all, validación de permisos exclusivamente en servidor, funciones privilegiadas con `search_path` fijo y `EXECUTE` mínimo, tablas inmutables por trigger, y Security Advisor sin hallazgos de seguridad accionables. La auditoría es **reproducible** con el script versionado.
