-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA A — Calificación por COMPETENCIAS (Ord. 04-2023) ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  El modelo curricular dominicano evalúa por COMPETENCIAS:             ║
-- ║   · 7 Competencias Fundamentales (transversales a todas las áreas).   ║
-- ║   · Competencias Específicas por área (configurable, sembradas).      ║
-- ║  La NOTA DEL ÁREA resume sus competencias específicas. Escala 0–100   ║
-- ║  con BANDAS DESCRIPTIVAS de desempeño (niveles de dominio MINERD).     ║
-- ║                                                                        ║
-- ║  Seguridad Fort Knox: RLS + FORCE en toda tabla nueva; el docente     ║
-- ║  queda limitado a SUS secciones (private.mis_secciones); inmutable al  ║
-- ║  cerrar el libro (public.libro_cierres). RPCs de boletín con patrón    ║
-- ║  private (DEFINER, guardia de rol) + wrapper public (INVOKER) →        ║
-- ║  Security Advisor limpio.                                              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ══════════════════════════════════════════════════════════════════════
--  1) Competencias Fundamentales (7 transversales por sede, configurables)
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.competencias_fundamentales (
  id          uuid primary key default gen_random_uuid(),
  sede_id     uuid not null references public.sedes(id) on delete cascade,
  codigo      text not null,
  nombre      text not null,
  descripcion text,
  orden       int  not null default 0,
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sede_id, codigo)
);

-- ══════════════════════════════════════════════════════════════════════
--  2) Competencias Específicas (por asignatura, configurables, sembradas)
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.competencias_especificas (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  asignatura_id uuid not null references public.asignaturas(id) on delete cascade,
  codigo        text not null,
  nombre        text not null,
  orden         int  not null default 0,
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (asignatura_id, codigo)
);
create index if not exists idx_comp_esp_asig
  on public.competencias_especificas(asignatura_id);

-- ══════════════════════════════════════════════════════════════════════
--  3) Bandas de desempeño (niveles de dominio 0–100 por sede, sembradas)
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.bandas_desempeno (
  id           uuid primary key default gen_random_uuid(),
  sede_id      uuid not null references public.sedes(id) on delete cascade,
  nombre_corto text not null,          -- p. ej. "LD", "LS", "LE", "EP", "LI"
  etiqueta     text not null,          -- p. ej. "Logro destacado"
  min_valor    numeric(5,2) not null check (min_valor >= 0 and min_valor <= 100),
  max_valor    numeric(5,2) not null check (max_valor >= 0 and max_valor <= 100),
  color        text not null,          -- hex para el boletín
  orden        int  not null default 0,
  created_at   timestamptz not null default now(),
  check (min_valor <= max_valor),
  unique (sede_id, nombre_corto)
);

-- ══════════════════════════════════════════════════════════════════════
--  4) Calificación por competencia (el libro tipo hoja de cálculo)
--     Polimórfica: una nota es de una fundamental XOR una específica.
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.calificacion_competencias (
  id             uuid primary key default gen_random_uuid(),
  seccion_id     uuid not null references public.secciones(id) on delete cascade,
  asignatura_id  uuid not null references public.asignaturas(id) on delete cascade,
  periodo_id     uuid not null references public.periodos(id) on delete cascade,
  estudiante_id  uuid not null references public.estudiantes(id) on delete cascade,
  fundamental_id uuid references public.competencias_fundamentales(id) on delete cascade,
  especifica_id  uuid references public.competencias_especificas(id) on delete cascade,
  valor          numeric(5,2) not null check (valor >= 0 and valor <= 100),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- exactamente una de las dos referencias:
  check ((fundamental_id is not null) <> (especifica_id is not null))
);
create unique index if not exists uq_calif_comp_fund
  on public.calificacion_competencias
     (seccion_id, asignatura_id, periodo_id, estudiante_id, fundamental_id)
  where fundamental_id is not null;
create unique index if not exists uq_calif_comp_esp
  on public.calificacion_competencias
     (seccion_id, asignatura_id, periodo_id, estudiante_id, especifica_id)
  where especifica_id is not null;
create index if not exists idx_calif_comp_libro
  on public.calificacion_competencias(seccion_id, asignatura_id, periodo_id);
create index if not exists idx_calif_comp_est
  on public.calificacion_competencias(estudiante_id, periodo_id);

drop trigger if exists trg_calif_comp_updated_at on public.calificacion_competencias;
create trigger trg_calif_comp_updated_at
  before update on public.calificacion_competencias
  for each row execute function public.set_updated_at();

-- ── Inmutabilidad al cerrar el libro (reusa public.libro_cierres) ───────
create or replace function private.bloquear_comp_cerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cerrado boolean;
  v_sec uuid; v_asg uuid; v_per uuid;
begin
  v_sec := coalesce(new.seccion_id, old.seccion_id);
  v_asg := coalesce(new.asignatura_id, old.asignatura_id);
  v_per := coalesce(new.periodo_id, old.periodo_id);

  select cerrado into v_cerrado
  from public.libro_cierres
  where seccion_id = v_sec and asignatura_id = v_asg and periodo_id = v_per;

  if coalesce(v_cerrado, false)
     and coalesce(current_setting('app.permitir_correccion', true), '') <> 'on' then
    raise exception 'Período cerrado: la competencia es inmutable. Requiere corrección autorizada por el director.'
      using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.bloquear_comp_cerrada() from public, anon, authenticated;

drop trigger if exists trg_calif_comp_inmutable on public.calificacion_competencias;
create trigger trg_calif_comp_inmutable
  before insert or update or delete on public.calificacion_competencias
  for each row execute function private.bloquear_comp_cerrada();

-- ══════════════════════════════════════════════════════════════════════
--  5) RLS + FORCE  (staff completo; docente SOLO sus secciones)
-- ══════════════════════════════════════════════════════════════════════
alter table public.competencias_fundamentales enable row level security;
alter table public.competencias_fundamentales force row level security;
alter table public.competencias_especificas   enable row level security;
alter table public.competencias_especificas   force row level security;
alter table public.bandas_desempeno            enable row level security;
alter table public.bandas_desempeno            force row level security;
alter table public.calificacion_competencias   enable row level security;
alter table public.calificacion_competencias   force row level security;

-- Catálogos: lectura para todo el staff docente; escritura solo dirección.
drop policy if exists comp_fund_select on public.competencias_fundamentales;
create policy comp_fund_select on public.competencias_fundamentales
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria','docente'));
drop policy if exists comp_fund_write on public.competencias_fundamentales;
create policy comp_fund_write on public.competencias_fundamentales
  for all to authenticated
  using (private.tiene_rol('director','coordinador'))
  with check (private.tiene_rol('director','coordinador'));

drop policy if exists comp_esp_select on public.competencias_especificas;
create policy comp_esp_select on public.competencias_especificas
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria','docente'));
drop policy if exists comp_esp_write on public.competencias_especificas;
create policy comp_esp_write on public.competencias_especificas
  for all to authenticated
  using (private.tiene_rol('director','coordinador'))
  with check (private.tiene_rol('director','coordinador'));

drop policy if exists bandas_select on public.bandas_desempeno;
create policy bandas_select on public.bandas_desempeno
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria','docente'));
drop policy if exists bandas_write on public.bandas_desempeno;
create policy bandas_write on public.bandas_desempeno
  for all to authenticated
  using (private.tiene_rol('director','coordinador'))
  with check (private.tiene_rol('director','coordinador'));

-- Libro de competencias: docente limitado a sus secciones.
drop policy if exists calif_comp_select on public.calificacion_competencias;
create policy calif_comp_select on public.calificacion_competencias
  for select to authenticated
  using (private.tiene_rol('director','coordinador','secretaria')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));
drop policy if exists calif_comp_write on public.calificacion_competencias;
create policy calif_comp_write on public.calificacion_competencias
  for all to authenticated
  using (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())))
  with check (private.tiene_rol('director','coordinador')
    or (private.tiene_rol('docente') and seccion_id in (select private.mis_secciones())));

-- ══════════════════════════════════════════════════════════════════════
--  6) Corrección autorizada (director, con justificación → bitácora)
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.corregir_competencia(
  p_calificacion uuid,
  p_valor numeric,
  p_justificacion text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_anterior numeric;
begin
  if not private.tiene_rol('director') then
    raise exception 'Solo el director puede autorizar correcciones.'
      using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_justificacion, ''))) < 5 then
    raise exception 'La justificación es obligatoria.'
      using errcode = 'check_violation';
  end if;
  if p_valor < 0 or p_valor > 100 then
    raise exception 'La calificación debe estar entre 0 y 100.'
      using errcode = 'check_violation';
  end if;

  select valor into v_anterior
  from public.calificacion_competencias where id = p_calificacion;

  perform set_config('app.permitir_correccion', 'on', true);
  update public.calificacion_competencias set valor = p_valor where id = p_calificacion;
  perform set_config('app.permitir_correccion', 'off', true);

  perform private.registrar_bitacora(
    'correccion_competencia',
    'calificacion_competencias',
    p_calificacion::text,
    jsonb_build_object(
      'valor_anterior', v_anterior,
      'valor_nuevo', p_valor,
      'justificacion', p_justificacion));
end;
$$;
revoke all on function public.corregir_competencia(uuid, numeric, text) from public, anon;
grant execute on function public.corregir_competencia(uuid, numeric, text) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  7) Autorización de lectura de boletín (staff / docente de la sección /
--     familia del estudiante). Helper reutilizable por los RPCs.
-- ══════════════════════════════════════════════════════════════════════
create or replace function private.puede_ver_boletin(p_est uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.tiene_rol('director','coordinador','secretaria')
      or (private.tiene_rol('docente') and private.ensena_estudiante(p_est))
      or (private.tiene_rol('tutor','estudiante')
          and p_est in (select private.mis_estudiantes()));
$$;
revoke all on function private.puede_ver_boletin(uuid) from public, anon;
grant execute on function private.puede_ver_boletin(uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  8) RPCs de boletín por competencias (DEFINER + wrapper INVOKER)
-- ══════════════════════════════════════════════════════════════════════

-- 8a) Resumen por ÁREA: nota del área = promedio de sus específicas.
create or replace function private.boletin_comp_areas(p_est uuid, p_periodo uuid)
returns table (
  asignatura_id uuid, asignatura text, area text, orden int,
  nota_area numeric, banda text, banda_corta text, color text,
  min_aprob numeric, aprobada boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.puede_ver_boletin(p_est) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
  with base as (
    select cc.asignatura_id,
           round(avg(cc.valor), 0) as nota
    from public.calificacion_competencias cc
    where cc.estudiante_id = p_est
      and cc.periodo_id = p_periodo
      and cc.especifica_id is not null
    group by cc.asignatura_id
  )
  select a.id, a.nombre, coalesce(a.area, '—'),
         row_number() over (order by a.area nulls last, a.nombre)::int,
         b.nota,
         bd.etiqueta, bd.nombre_corto, bd.color,
         nv.min_aprobacion,
         case when nv.min_aprobacion is null then true
              else b.nota >= nv.min_aprobacion end
  from base b
  join public.asignaturas a on a.id = b.asignatura_id
  left join public.matriculas m
    on m.estudiante_id = p_est and m.estado = 'activa'
  left join public.secciones s on s.id = m.seccion_id
  left join public.grados g on g.id = s.grado_id
  left join public.niveles nv on nv.id = g.nivel_id
  left join public.bandas_desempeno bd
    on bd.sede_id = a.sede_id
   and b.nota >= bd.min_valor and b.nota <= bd.max_valor
  order by 4;
end;
$$;
revoke all on function private.boletin_comp_areas(uuid, uuid) from public, anon;
grant execute on function private.boletin_comp_areas(uuid, uuid) to authenticated, service_role;

create or replace function public.boletin_comp_areas(p_est uuid, p_periodo uuid)
returns table (
  asignatura_id uuid, asignatura text, area text, orden int,
  nota_area numeric, banda text, banda_corta text, color text,
  min_aprob numeric, aprobada boolean)
language sql stable security invoker set search_path = ''
as $$ select * from private.boletin_comp_areas(p_est, p_periodo); $$;
revoke all on function public.boletin_comp_areas(uuid, uuid) from public, anon;
grant execute on function public.boletin_comp_areas(uuid, uuid) to authenticated, service_role;

-- 8b) Detalle por competencia específica (para el desglose del boletín).
create or replace function private.boletin_comp_detalle(p_est uuid, p_periodo uuid)
returns table (
  asignatura_id uuid, asignatura text, competencia_id uuid, competencia text,
  comp_orden int, valor numeric, banda text, color text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.puede_ver_boletin(p_est) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
  select a.id, a.nombre, ce.id, ce.nombre, ce.orden, cc.valor,
         bd.etiqueta, bd.color
  from public.calificacion_competencias cc
  join public.competencias_especificas ce on ce.id = cc.especifica_id
  join public.asignaturas a on a.id = cc.asignatura_id
  left join public.bandas_desempeno bd
    on bd.sede_id = a.sede_id
   and cc.valor >= bd.min_valor and cc.valor <= bd.max_valor
  where cc.estudiante_id = p_est
    and cc.periodo_id = p_periodo
    and cc.especifica_id is not null
  order by a.area nulls last, a.nombre, ce.orden;
end;
$$;
revoke all on function private.boletin_comp_detalle(uuid, uuid) from public, anon;
grant execute on function private.boletin_comp_detalle(uuid, uuid) to authenticated, service_role;

create or replace function public.boletin_comp_detalle(p_est uuid, p_periodo uuid)
returns table (
  asignatura_id uuid, asignatura text, competencia_id uuid, competencia text,
  comp_orden int, valor numeric, banda text, color text)
language sql stable security invoker set search_path = ''
as $$ select * from private.boletin_comp_detalle(p_est, p_periodo); $$;
revoke all on function public.boletin_comp_detalle(uuid, uuid) from public, anon;
grant execute on function public.boletin_comp_detalle(uuid, uuid) to authenticated, service_role;

-- 8c) Competencias fundamentales (promedio transversal a todas las áreas).
create or replace function private.boletin_comp_fundamentales(p_est uuid, p_periodo uuid)
returns table (
  competencia_id uuid, competencia text, comp_orden int,
  promedio numeric, banda text, color text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.puede_ver_boletin(p_est) then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  return query
  with prom as (
    select cf.id, cf.nombre, cf.orden, cf.sede_id,
           round(avg(cc.valor), 0) as p
    from public.calificacion_competencias cc
    join public.competencias_fundamentales cf on cf.id = cc.fundamental_id
    where cc.estudiante_id = p_est
      and cc.periodo_id = p_periodo
      and cc.fundamental_id is not null
    group by cf.id, cf.nombre, cf.orden, cf.sede_id
  )
  select prom.id, prom.nombre, prom.orden, prom.p,
         bd.etiqueta, bd.color
  from prom
  left join public.bandas_desempeno bd
    on bd.sede_id = prom.sede_id
   and prom.p >= bd.min_valor and prom.p <= bd.max_valor
  order by prom.orden;
end;
$$;
revoke all on function private.boletin_comp_fundamentales(uuid, uuid) from public, anon;
grant execute on function private.boletin_comp_fundamentales(uuid, uuid) to authenticated, service_role;

create or replace function public.boletin_comp_fundamentales(p_est uuid, p_periodo uuid)
returns table (
  competencia_id uuid, competencia text, comp_orden int,
  promedio numeric, banda text, color text)
language sql stable security invoker set search_path = ''
as $$ select * from private.boletin_comp_fundamentales(p_est, p_periodo); $$;
revoke all on function public.boletin_comp_fundamentales(uuid, uuid) from public, anon;
grant execute on function public.boletin_comp_fundamentales(uuid, uuid) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  9) SEMILLA — bandas, competencias y calificaciones de demostración
-- ══════════════════════════════════════════════════════════════════════
do $$
declare
  v_sede uuid;
  v_anio uuid;
begin
  select id into v_sede from public.sedes order by created_at limit 1;
  if v_sede is null then return; end if;
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  -- 9a) Bandas de desempeño (niveles de dominio 0–100) ──────────────────
  if not exists (select 1 from public.bandas_desempeno where sede_id = v_sede) then
    insert into public.bandas_desempeno
      (sede_id, nombre_corto, etiqueta, min_valor, max_valor, color, orden)
    values
      (v_sede, 'LD', 'Logro destacado',        90, 100, '#1E7F4F', 1),
      (v_sede, 'LS', 'Logro satisfactorio',    80,  89, '#2E9E6B', 2),
      (v_sede, 'LE', 'Logro esperado',         70,  79, '#C9A227', 3),
      (v_sede, 'EP', 'En proceso',             60,  69, '#E08A2B', 4),
      (v_sede, 'LI', 'Logro inicial',           0,  59, '#D14343', 5);
  end if;

  -- 9b) Competencias Fundamentales (7 transversales) ────────────────────
  if not exists (select 1 from public.competencias_fundamentales where sede_id = v_sede) then
    insert into public.competencias_fundamentales (sede_id, codigo, nombre, descripcion, orden)
    values
      (v_sede, 'CF1', 'Comunicativa',
       'Comprende y expresa ideas con claridad en distintos lenguajes y contextos.', 1),
      (v_sede, 'CF2', 'Pensamiento Lógico, Creativo y Crítico',
       'Analiza, razona y genera ideas nuevas para comprender la realidad.', 2),
      (v_sede, 'CF3', 'Resolución de Problemas',
       'Identifica situaciones y aplica estrategias para resolverlas.', 3),
      (v_sede, 'CF4', 'Científica y Tecnológica',
       'Usa conocimientos y herramientas científico-tecnológicas con responsabilidad.', 4),
      (v_sede, 'CF5', 'Ética y Ciudadana',
       'Actúa con valores, respeto y compromiso con el bien común.', 5),
      (v_sede, 'CF6', 'Desarrollo Personal y Espiritual',
       'Construye su identidad, proyecto de vida y apertura a la trascendencia.', 6),
      (v_sede, 'CF7', 'Ambiental y de la Salud',
       'Promueve el cuidado de sí, de los demás y del medio ambiente.', 7);
  end if;

  -- 9c) Competencias Específicas por asignatura (según su área) ──────────
  if not exists (select 1 from public.competencias_especificas where sede_id = v_sede) then
    insert into public.competencias_especificas (sede_id, asignatura_id, codigo, nombre, orden)
    select v_sede, a.id, grp.prefijo || ce.n, ce.nombre, ce.n
    from public.asignaturas a
    cross join lateral (
      select case
        when a.area ilike '%lengua espa%' or a.area ilike '%español%' then 'LENGUA'
        when a.area ilike '%matem%' then 'MATE'
        when a.area ilike '%ingl%' or a.area ilike '%extranj%'
             or (a.area ilike '%lengua%' and a.area not ilike '%espa%') then 'IDIOMA'
        when a.area ilike '%social%' then 'SOCIALES'
        when a.area ilike '%natural%' then 'NATURALES'
        when a.area ilike '%religi%' or a.area ilike '%human%' then 'FIHR'
        when a.area ilike '%físic%' or a.area ilike '%fisic%' then 'EDFISICA'
        when a.area ilike '%artíst%' or a.area ilike '%artist%' or a.area ilike '%arte%' then 'ARTE'
        else 'GENERICO'
      end as grupo
    ) g
    cross join lateral (
      select left(g.grupo, 2) as prefijo
    ) grp
    join lateral (
      values
        ('LENGUA', 1, 'Comprensión oral'),
        ('LENGUA', 2, 'Comprensión escrita'),
        ('LENGUA', 3, 'Producción oral'),
        ('LENGUA', 4, 'Producción escrita'),
        ('MATE', 1, 'Razonamiento y argumentación'),
        ('MATE', 2, 'Comunicación matemática'),
        ('MATE', 3, 'Modelación y representación'),
        ('MATE', 4, 'Resolución de problemas'),
        ('IDIOMA', 1, 'Comprensión oral'),
        ('IDIOMA', 2, 'Comprensión escrita'),
        ('IDIOMA', 3, 'Producción oral'),
        ('IDIOMA', 4, 'Producción escrita'),
        ('SOCIALES', 1, 'Ubicación en el tiempo y el espacio'),
        ('SOCIALES', 2, 'Interacción sociocultural y construcción ciudadana'),
        ('SOCIALES', 3, 'Utilización crítica de fuentes de información'),
        ('NATURALES', 1, 'Ofrece explicaciones científicas'),
        ('NATURALES', 2, 'Aplica y comunica ideas científicas'),
        ('NATURALES', 3, 'Indaga aplicando el método científico'),
        ('FIHR', 1, 'Valoración de la reflexión ética'),
        ('FIHR', 2, 'Apertura a la trascendencia'),
        ('FIHR', 3, 'Construcción del proyecto de vida'),
        ('EDFISICA', 1, 'Integración del esquema corporal y motriz'),
        ('EDFISICA', 2, 'Interacción socio-motriz'),
        ('EDFISICA', 3, 'Expresión y comunicación corporal'),
        ('ARTE', 1, 'Expresión y comunicación artística'),
        ('ARTE', 2, 'Apreciación estética y valoración'),
        ('ARTE', 3, 'Aplicación de técnicas y procedimientos'),
        ('GENERICO', 1, 'Dominio conceptual del área'),
        ('GENERICO', 2, 'Aplicación y desempeño'),
        ('GENERICO', 3, 'Actitud y participación')
    ) ce(grupo, n, nombre) on ce.grupo = g.grupo
    where a.sede_id = v_sede;
  end if;

  -- 9d) Calificaciones de competencias (demo determinista P1/P2/P3) ──────
  -- Sólo Primaria y Secundaria (numérica). Fundamentales + específicas por
  -- (sección, asignatura, período, estudiante). Valores 55..100 deterministas.
  if v_anio is not null
     and not exists (select 1 from public.calificacion_competencias limit 1) then

    -- La semilla escribe también en períodos ya cerrados (P1/P2). Es una
    -- carga de sistema, así que abrimos el bypass de inmutabilidad sólo
    -- dentro de esta transacción de migración.
    perform set_config('app.permitir_correccion', 'on', true);

    -- Específicas: una fila por competencia específica de la asignatura.
    insert into public.calificacion_competencias
      (seccion_id, asignatura_id, periodo_id, estudiante_id, especifica_id, valor)
    select s.id, ce.asignatura_id, per.id, m.estudiante_id, ce.id,
      (55 + abs(hashtext(
        m.estudiante_id::text || ce.id::text || per.id::text
      )) % 46)::numeric
    from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    join public.pensum p on p.grado_id = g.id
    join public.competencias_especificas ce on ce.asignatura_id = p.asignatura_id
    join public.matriculas m
      on m.seccion_id = s.id and m.anio_id = s.anio_id and m.estado = 'activa'
    join public.periodos per on per.anio_id = s.anio_id and per.orden in (1, 2, 3)
    where n.codigo in ('PRIMARIA', 'SECUNDARIA') and s.anio_id = v_anio;

    -- Fundamentales: transversales, evaluadas dentro de cada asignatura.
    insert into public.calificacion_competencias
      (seccion_id, asignatura_id, periodo_id, estudiante_id, fundamental_id, valor)
    select s.id, p.asignatura_id, per.id, m.estudiante_id, cf.id,
      (60 + abs(hashtext(
        m.estudiante_id::text || cf.id::text || per.id::text || p.asignatura_id::text
      )) % 41)::numeric
    from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    join public.pensum p on p.grado_id = g.id
    join public.competencias_fundamentales cf on cf.sede_id = n.sede_id
    join public.matriculas m
      on m.seccion_id = s.id and m.anio_id = s.anio_id and m.estado = 'activa'
    join public.periodos per on per.anio_id = s.anio_id and per.orden in (1, 2, 3)
    where n.codigo in ('PRIMARIA', 'SECUNDARIA') and s.anio_id = v_anio;

    perform set_config('app.permitir_correccion', 'off', true);
  end if;
end $$;

commit;
