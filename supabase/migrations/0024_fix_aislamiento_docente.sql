-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · AUDITORÍA — Fix aislamiento docente (least-privilege)  ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  HALLAZGO (pentest B1): las políticas de calificaciones, asistencia,  ║
-- ║  evaluación inicial, cierres de libro, disciplina y recuperación      ║
-- ║  daban acceso al rol 'docente' SIN scoping por sección → un docente   ║
-- ║  podía leer/escribir datos de CUALQUIER sección del colegio.          ║
-- ║  Corrección: el docente queda limitado a SUS secciones asignadas.     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Secciones asignadas al docente actual ──────────────────────────────
create or replace function private.mis_secciones()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select ds.seccion_id
  from public.docente_secciones ds
  join public.empleados e on e.id = ds.empleado_id
  where e.profile_id = (select auth.uid());
$$;
revoke all on function private.mis_secciones() from public, anon;
grant execute on function private.mis_secciones() to authenticated, service_role;

-- ── ¿El docente actual enseña a este estudiante? ───────────────────────
create or replace function private.ensena_estudiante(p_est uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.matriculas m
    where m.estudiante_id = p_est and m.estado = 'activa'
      and m.seccion_id in (
        select ds.seccion_id from public.docente_secciones ds
        join public.empleados e on e.id = ds.empleado_id
        where e.profile_id = (select auth.uid())));
$$;
revoke all on function private.ensena_estudiante(uuid) from public, anon;
grant execute on function private.ensena_estudiante(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  Reescritura de políticas: staff ve todo; docente SOLO sus secciones.
-- ══════════════════════════════════════════════════════════════════════

-- ── Calificaciones ──────────────────────────────────────────────────────
drop policy if exists calif_select on public.calificacion_componentes;
create policy calif_select on public.calificacion_componentes
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));
drop policy if exists calif_write on public.calificacion_componentes;
create policy calif_write on public.calificacion_componentes
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ── Asistencia: sesiones ────────────────────────────────────────────────
drop policy if exists asis_ses_select on public.asistencia_sesiones;
create policy asis_ses_select on public.asistencia_sesiones
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));
drop policy if exists asis_ses_write on public.asistencia_sesiones;
create policy asis_ses_write on public.asistencia_sesiones
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ── Asistencia: registros (vía la sesión) ──────────────────────────────
drop policy if exists asis_reg_select on public.asistencia_registros;
create policy asis_reg_select on public.asistencia_registros
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and exists (
      select 1 from public.asistencia_sesiones s
      where s.id = sesion_id and s.seccion_id in (select private.mis_secciones()))));
drop policy if exists asis_reg_write on public.asistencia_registros;
create policy asis_reg_write on public.asistencia_registros
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and exists (
      select 1 from public.asistencia_sesiones s
      where s.id = sesion_id and s.seccion_id in (select private.mis_secciones()))))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and exists (
      select 1 from public.asistencia_sesiones s
      where s.id = sesion_id and s.seccion_id in (select private.mis_secciones()))));

-- ── Evaluación inicial ──────────────────────────────────────────────────
drop policy if exists eval_ini_select on public.evaluaciones_inicial;
create policy eval_ini_select on public.evaluaciones_inicial
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));
drop policy if exists eval_ini_write on public.evaluaciones_inicial;
create policy eval_ini_write on public.evaluaciones_inicial
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ── Observaciones inicial ───────────────────────────────────────────────
drop policy if exists obs_ini_select on public.observaciones_inicial;
create policy obs_ini_select on public.observaciones_inicial
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));
drop policy if exists obs_ini_write on public.observaciones_inicial;
create policy obs_ini_write on public.observaciones_inicial
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ── Cierres de libro ────────────────────────────────────────────────────
drop policy if exists cierres_select on public.libro_cierres;
create policy cierres_select on public.libro_cierres
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));
drop policy if exists cierres_write on public.libro_cierres;
create policy cierres_write on public.libro_cierres
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ── Recuperaciones (docente: solo lectura de sus secciones) ────────────
drop policy if exists recup_select on public.recuperaciones;
create policy recup_select on public.recuperaciones
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ── Disciplina (docente: solo estudiantes que enseña) ──────────────────
drop policy if exists incid_select on public.incidencias_disciplina;
create policy incid_select on public.incidencias_disciplina
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and private.ensena_estudiante(estudiante_id)));
drop policy if exists incid_insert on public.incidencias_disciplina;
create policy incid_insert on public.incidencias_disciplina
  for insert to authenticated
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and private.ensena_estudiante(estudiante_id)));

commit;
