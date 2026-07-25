# Auditoría de Seguridad Fort Knox — JM ESCOLAR (EJECUTADA)

**Sistema:** JM ESCOLAR — Gestión Académica Integral (demo comercial RD)
**Proyecto Supabase:** `vzfotzaumqnhjgckjxdt` · **Migraciones:** `0001`–`0024`
**Método:** pentest ejecutado en vivo contra la base de datos (no checklist). Cada ataque se lanzó como el rol atacante (`set role authenticated`/`anon` + JWT del atacante) y se documenta el resultado real. Consultas de solo lectura + los fixes aplicados. Script base: [`supabase/audit/auditoria_seguridad.sql`](../supabase/audit/auditoria_seguridad.sql).

---

## Veredicto

> **El sistema está LISTO para entregarse a un colegio real**, sin riesgo conocido de fuga de datos de menores ni escalada de privilegios — **una vez aplicados los pasos manuales de la sección final** (rotar credenciales demo del portal, habilitar HIBP en plan Pro, y verificar por HTTP los headers y la expiración de signed URLs, que este entorno no puede alcanzar).
>
> El pentest encontró **1 hallazgo crítico** (aislamiento docente sin scoping por sección) que fue **corregido y re-verificado en vivo**. Los 10 ataques quedan bloqueados. Sin este fix, el veredicto habría sido NO listo.

---

## Parte A — Preparación

| Control | Resultado |
|---|---|
| Tablas en `public` | **54** |
| RLS habilitado | ✅ 54 / 54 |
| RLS **FORCE** | ✅ 54 / 54 |
| Tablas sin RLS o sin FORCE | ✅ **0** |
| Inmutables por diseño (triggers presentes) | ✅ bitácora, documentos_emitidos, pagos, pago_aplicaciones, notas_credito, cierres_caja, incidencias_disciplina (append-only) + calificaciones/asistencia/nómina/circulares cerradas (condicional) |
| Sujetos de prueba | ✅ 7 roles + estudiante desactivado + cuenta demo **vencida** (creados, atacados y eliminados) |

## Parte B — Pentest (10 ataques, resultado real)

| # | Ataque | Resultado |
|---|--------|-----------|
| B1 | **Aislamiento docente** — leer/escribir notas de una sección NO asignada manipulando `seccion_id` | 🔴 **NO bloqueado → CORREGIDO.** La política era solo por rol. Tras el fix: docente ve 1296 notas de su sección y **0** de una ajena; escritura fuera de su sección rechazada. |
| B2 | **Aislamiento de padre** — alcanzar expediente/notas/estado de cuenta de un estudiante ajeno | 🟢 **Bloqueado.** Padre ve 0 estudiantes / 0 notas / 0 cargos por acceso directo; `portal_calificaciones(ajeno)` → `42501 No autorizado`. |
| B3 | **Escalada de rol** — docente abriendo módulo financiero/nómina por API | 🟢 **Bloqueado.** Docente ve 0 en cargos, pagos, nóminas, líneas de nómina y contratos. |
| B4 | **Inmutabilidad** — UPDATE/DELETE directo a calificación cerrada, recibo, bitácora, asistencia (con anon y con rol privilegiado) | 🟢 **Bloqueado a nivel BD.** Doble barrera: RLS (sin política de UPDATE/DELETE) **y** trigger. Evidencia: `DELETE pagos` → `Registro inmutable`; `UPDATE bitacora` como dueño → `Registro inmutable` (el trigger dispara aun sin RLS). |
| B5 | **Anon key** — consultar estudiantes, notas, finanzas | 🟢 **Bloqueado.** anon ve 0 en estudiantes, calificaciones, cargos, pagos. |
| B6 | **Storage** — abrir foto/acta/documento sin signed URL | 🟢 **Bloqueado (config).** Buckets `estudiantes` y `empleados` son **privados** (`public=false`), 8 políticas RLS en `storage.objects`. Verificación por HTTP de signed URL vencida → paso manual (ver abajo). |
| B7 | **Bloqueo por morosidad** — ver notas saltando el bloqueo desde el cliente | 🟢 **Bloqueado en servidor.** Con bloqueo activo: `bloqueado=true` y `portal_calificaciones` devuelve **0** filas (recalculado en BD, no en el cliente). |
| B8 | **Acceso demo vencido** — entrar, auto-extenderse, tocar otras cuentas o el panel super-admin | 🟢 **Bloqueado.** `mi_acceso_demo.bloqueado=true`; `es_superadmin=false`; auto-renovar → `No autorizado`; no ve `accesos_demo` ni `super_admins` (RLS = 0 filas). |
| B9 | **Rate limiting de login** — fuerza bruta; throttle por usuario, no solo por IP | 🟡 **Endurecido en código.** Se agregó throttle **por correo** además de por IP (el hueco de la IP tras proxy). El backstop definitivo es el rate-limit propio de Supabase Auth. Nota: el limitador en memoria es best-effort en serverless — ver pasos manuales. |
| B10 | **RPCs como anon** — invocar funciones sin auth | 🟢 **Bloqueado.** `panel_morosidad`, `dash_kpis`, `nexus_listar_accesos`, `portal_calificaciones` → `permission denied for function`. Todas las `SECURITY DEFINER` con `search_path` fijo (0 excepciones). |

## Parte C — Fuga de secretos

| Control | Resultado |
|---|---|
| `service_role` en el bundle del cliente | 🟢 **No.** `grep` sobre `.next/static` → ausente; `createAdminClient` no está en el grafo del cliente (protegido por `import "server-only"`). |
| Secretos en historial de commits | 🟢 **Sin PAT ni service_role real** en ningún commit (solo placeholders en `.env.example`). 🟡 **Hallazgo C2:** contraseñas de las cuentas **demo del portal** (`PortalFamilia2026`/`PortalEstudiante2026`) hardcodeadas en la migración `0016` — cuentas tutor/estudiante aisladas por RLS, sin privilegios. Ver pasos manuales. |
| Salvaguarda no-console (ESLint) | 🟢 **Agregada.** Regla `no-console` (permite `warn`/`error`); lint limpio → ningún `console.log` filtra credenciales ni datos de menores. |
| `npm audit` | 🟡 Bump **Next 14.2.18 → 14.2.35** cierra el advisory **crítico** de runtime (disclosure de endpoints de Server Functions). Restan 2 de `postcss` (severidad alta) **de build-time**, no explotables en el app desplegado; su cierre requiere `next@16` (breaking) — recomendado para una fase posterior. |

## Parte D — Configuración

| Control | Resultado |
|---|---|
| Headers de seguridad | 🟢 **Configurados** en `next.config`: CSP, HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Verificación por HTTP en producción → paso manual. |
| Supabase Security Advisor | 🟢 **Limpio** — 1 solo lint: `auth_leaked_password_protection` (WARN), no accionable en plan free. |

---

## Hallazgos y remediación

| # | Hallazgo | Severidad | Estado |
|---|----------|-----------|--------|
| 1 | **Aislamiento docente sin scoping por sección** — 7 tablas (calificaciones, asistencia sesiones/registros, evaluación inicial, observaciones, cierres de libro, disciplina, recuperación) daban acceso por rol `docente` a **cualquier** sección; un docente podía **leer y escribir** notas/asistencia de todo el colegio y ver todo el expediente disciplinario. | **Crítica** (exposición y manipulación de datos académicos de menores fuera de need-to-know) | ✅ **Corregido** en `0024`: `private.mis_secciones()` + `ensena_estudiante()`; políticas reescritas (staff ve todo, docente solo sus secciones). Re-verificado en vivo. |
| 2 | **Login con throttle solo por IP** (inútil tras proxy de Vercel) | Media | ✅ **Corregido:** throttle por correo + por IP. Backstop: Supabase Auth. |
| 3 | **Sin regla `no-console`** — riesgo de logs con datos sensibles | Baja | ✅ **Corregido:** ESLint `no-console`; lint limpio. |
| 4 | **Advisory crítico de Next.js** (disclosure de Server Function endpoints) | Alta | ✅ **Corregido:** bump a Next 14.2.35. |
| 5 | **Contraseñas demo del portal hardcodeadas** (migración `0016`) | Baja (cuentas sin privilegios, RLS) | ⚠️ **Paso manual** (rotar/eliminar antes de entrega real). |
| — | `postcss` build-time (2 high) · HIBP (WARN) | Baja / informativo | Aceptado; ver pasos manuales. |

---

## Pasos manuales antes de entregar a un colegio real (te tocan a ti)

1. **Rotar/eliminar las cuentas demo del portal** (`familia.demo@jmescolar.do`, `estudiante.demo@jmescolar.do`) — sus contraseñas están en `0016`. En un colegio real las cuentas de familia se crean por el flujo normal; borra las demo o cámbiales la contraseña desde Supabase Auth.
2. **Habilitar "Leaked Password Protection" (HIBP)** en Supabase → Authentication → Password (requiere plan **Pro**). Cierra el único WARN del Advisor.
3. **Verificar los headers en producción por HTTP** (este entorno no alcanza `*.vercel.app`):
   `curl -sI https://<tu-dominio>/login | grep -iE "content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy"`
4. **Verificar expiración de signed URLs de storage:** genera una signed URL de una foto, espera a que expire y confirma `400/403`; y confirma que la URL pública directa de un bucket privado da error.
5. **Rate limiting distribuido:** el limitador actual es en memoria (best-effort en serverless). Para producción de alto valor, respaldar con un store compartido (p. ej. Upstash Redis) manteniendo la firma de `checkRateLimit()`. El rate-limit de Supabase Auth ya frena la fuerza bruta a nivel de proveedor.
6. **(Opcional) `next@16`** en una fase posterior para cerrar los advisories `postcss` de build-time.
7. **Rotar el `service_role` y el PAT** si en algún momento se compartieron fuera del entorno seguro.

---

## Conclusión

El pentest se ejecutó atacando el sistema como cada rol y como anónimo. El único hallazgo crítico (aislamiento docente) fue corregido y re-verificado con evidencia real (docente: 1296 notas de su sección, **0** de una ajena). Con los pasos manuales aplicados, **el sistema resiste los 10 vectores probados y es apto para operar con datos reales de menores** bajo la política Fort Knox: RLS+FORCE universal, least-privilege por sección, inmutabilidad a nivel de BD, secretos fuera del cliente y del historial, y Security Advisor limpio.
