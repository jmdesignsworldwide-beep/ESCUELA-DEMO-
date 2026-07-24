-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 8 — Evaluación de Nivel Inicial                   ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Evaluación CUALITATIVA por indicadores de logro y áreas de           ║
-- ║  desarrollo. Nada numérico. Observaciones narrativas por estudiante.  ║
-- ║  RLS + FORCE. Semilla MINERD + evaluaciones de P1/P2/P3.              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipo ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'escala_inicial') then
    create type public.escala_inicial as enum
      ('en_proceso', 'logrado', 'consolidado');
  end if;
end $$;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.areas_desarrollo (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  nombre     text not null,
  codigo     text not null,
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  unique (sede_id, codigo)
);

create table if not exists public.indicadores_logro (
  id          uuid primary key default gen_random_uuid(),
  area_id     uuid not null references public.areas_desarrollo(id) on delete cascade,
  descripcion text not null,
  orden       int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.evaluaciones_inicial (
  id            uuid primary key default gen_random_uuid(),
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  indicador_id  uuid not null references public.indicadores_logro(id) on delete cascade,
  periodo_id    uuid not null references public.periodos(id) on delete cascade,
  valor         public.escala_inicial not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (estudiante_id, indicador_id, periodo_id)
);

create table if not exists public.observaciones_inicial (
  id            uuid primary key default gen_random_uuid(),
  seccion_id    uuid not null references public.secciones(id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  periodo_id    uuid not null references public.periodos(id) on delete cascade,
  texto         text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (estudiante_id, periodo_id)
);

create index if not exists idx_indic_area on public.indicadores_logro(area_id);
create index if not exists idx_eval_ini_est on public.evaluaciones_inicial(estudiante_id, periodo_id);
create index if not exists idx_eval_ini_sec on public.evaluaciones_inicial(seccion_id, periodo_id);
create index if not exists idx_obs_ini on public.observaciones_inicial(estudiante_id, periodo_id);

drop trigger if exists trg_eval_ini_updated_at on public.evaluaciones_inicial;
create trigger trg_eval_ini_updated_at
  before update on public.evaluaciones_inicial
  for each row execute function public.set_updated_at();
drop trigger if exists trg_obs_ini_updated_at on public.observaciones_inicial;
create trigger trg_obs_ini_updated_at
  before update on public.observaciones_inicial
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'areas_desarrollo','indicadores_logro','evaluaciones_inicial','observaciones_inicial'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- Catálogo (áreas/indicadores): lectura activos, escritura dirección/coordinación.
drop policy if exists areas_select on public.areas_desarrollo;
create policy areas_select on public.areas_desarrollo
  for select to authenticated using (private.es_activo());
drop policy if exists areas_write on public.areas_desarrollo;
create policy areas_write on public.areas_desarrollo
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

drop policy if exists indic_select on public.indicadores_logro;
create policy indic_select on public.indicadores_logro
  for select to authenticated using (private.es_activo());
drop policy if exists indic_write on public.indicadores_logro;
create policy indic_write on public.indicadores_logro
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

-- Evaluaciones y observaciones: lectura staff/docente, escritura docencia.
drop policy if exists eval_ini_select on public.evaluaciones_inicial;
create policy eval_ini_select on public.evaluaciones_inicial
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists eval_ini_write on public.evaluaciones_inicial;
create policy eval_ini_write on public.evaluaciones_inicial
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente'))
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

drop policy if exists obs_ini_select on public.observaciones_inicial;
create policy obs_ini_select on public.observaciones_inicial
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'docente'));
drop policy if exists obs_ini_write on public.observaciones_inicial;
create policy obs_ini_write on public.observaciones_inicial
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'docente'))
  with check (private.tiene_rol('director', 'coordinador', 'docente'));

-- ── Semilla: áreas de desarrollo e indicadores (MINERD Inicial) ─────────
do $$
declare
  v_sede uuid;
  v_anio uuid;
  a_dps uuid; a_com uuid; a_log uuid; a_mun uuid; a_art uuid; a_psi uuid;
begin
  if exists (select 1 from public.areas_desarrollo limit 1) then
    return;
  end if;

  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  insert into public.areas_desarrollo (sede_id, nombre, codigo, orden) values
    (v_sede, 'Desarrollo Personal, Social y Emocional', 'DPS', 1) returning id into a_dps;
  insert into public.areas_desarrollo (sede_id, nombre, codigo, orden) values
    (v_sede, 'Comunicación y Lenguaje', 'COM', 2) returning id into a_com;
  insert into public.areas_desarrollo (sede_id, nombre, codigo, orden) values
    (v_sede, 'Pensamiento Lógico, Matemático y Científico', 'LOG', 3) returning id into a_log;
  insert into public.areas_desarrollo (sede_id, nombre, codigo, orden) values
    (v_sede, 'Descubrimiento y Comprensión del Mundo', 'MUN', 4) returning id into a_mun;
  insert into public.areas_desarrollo (sede_id, nombre, codigo, orden) values
    (v_sede, 'Expresión y Apreciación Artística', 'ART', 5) returning id into a_art;
  insert into public.areas_desarrollo (sede_id, nombre, codigo, orden) values
    (v_sede, 'Desarrollo Físico y Psicomotriz', 'PSI', 6) returning id into a_psi;

  insert into public.indicadores_logro (area_id, descripcion, orden) values
    (a_dps, 'Expresa sus emociones y necesidades con seguridad.', 1),
    (a_dps, 'Comparte y coopera en juegos y actividades de grupo.', 2),
    (a_dps, 'Practica hábitos de higiene y autonomía personal.', 3),
    (a_com, 'Comprende y sigue instrucciones sencillas.', 1),
    (a_com, 'Se expresa oralmente con vocabulario adecuado a su edad.', 2),
    (a_com, 'Muestra interés por los cuentos y las imágenes.', 3),
    (a_com, 'Reconoce su nombre y algunas letras.', 4),
    (a_log, 'Cuenta y reconoce cantidades hasta 10.', 1),
    (a_log, 'Identifica formas, colores y tamaños.', 2),
    (a_log, 'Establece relaciones de orden y clasificación.', 3),
    (a_mun, 'Observa y explora su entorno natural con curiosidad.', 1),
    (a_mun, 'Reconoce elementos de su comunidad y familia.', 2),
    (a_art, 'Se expresa a través del dibujo, la pintura y el modelado.', 1),
    (a_art, 'Participa en cantos, rondas y expresión corporal.', 2),
    (a_psi, 'Coordina movimientos gruesos al correr, saltar y trepar.', 1),
    (a_psi, 'Desarrolla la motricidad fina en trazos y ensartes.', 2);

  -- Evaluaciones cualitativas para estudiantes de Inicial (P1/P2/P3).
  insert into public.evaluaciones_inicial
    (seccion_id, estudiante_id, indicador_id, periodo_id, valor)
  select m.seccion_id, m.estudiante_id, i.id, per.id,
    (case abs(hashtext(
        m.estudiante_id::text || i.id::text || per.id::text
     )) % 3
       when 0 then 'en_proceso'
       when 1 then 'logrado'
       else 'consolidado'
     end)::public.escala_inicial
  from public.matriculas m
  join public.secciones s on s.id = m.seccion_id
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  join public.indicadores_logro i on true
  join public.periodos per on per.anio_id = v_anio and per.orden in (1, 2, 3)
  where n.codigo = 'INICIAL' and m.anio_id = v_anio and m.estado = 'activa';

  -- Observaciones narrativas de ejemplo (P3 en curso).
  insert into public.observaciones_inicial (seccion_id, estudiante_id, periodo_id, texto)
  select m.seccion_id, m.estudiante_id, per.id,
    'Es un niño(a) participativo(a) y afectuoso(a). Avanza muy bien en su ' ||
    'proceso de socialización y disfruta las actividades artísticas. ' ||
    'Se recomienda seguir reforzando el reconocimiento de cantidades en casa.'
  from public.matriculas m
  join public.secciones s on s.id = m.seccion_id
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  join public.periodos per on per.anio_id = v_anio and per.orden = 3
  where n.codigo = 'INICIAL' and m.anio_id = v_anio and m.estado = 'activa';
end $$;

commit;
