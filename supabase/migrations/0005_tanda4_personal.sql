-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 4 — Docentes y Personal                          ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Expediente del empleado (docente/administrativo/apoyo), asignación   ║
-- ║  de secciones y asignaturas con carga horaria, y documentos en        ║
-- ║  storage privado. RLS + FORCE. Semilla ~20 docentes + personal.       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_empleado') then
    create type public.tipo_empleado as enum
      ('docente', 'administrativo', 'apoyo', 'directivo');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_empleado') then
    create type public.estado_empleado as enum ('activo', 'licencia', 'inactivo');
  end if;
end $$;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.empleados (
  id                uuid primary key default gen_random_uuid(),
  sede_id           uuid not null references public.sedes(id) on delete cascade,
  profile_id        uuid references public.profiles(id) on delete set null,
  codigo            text not null unique,
  nombres           text not null,
  apellidos         text not null,
  cedula            text,
  tipo              public.tipo_empleado not null default 'docente',
  cargo             text not null,
  telefono          text,
  email             text,
  direccion         text,
  fecha_ingreso     date,
  titulo_academico  text,
  foto_path         text,
  estado            public.estado_empleado not null default 'activo',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Asignación docente ↔ (sección, asignatura) con carga horaria.
create table if not exists public.docente_secciones (
  id              uuid primary key default gen_random_uuid(),
  empleado_id     uuid not null references public.empleados(id) on delete cascade,
  seccion_id      uuid not null references public.secciones(id) on delete cascade,
  asignatura_id   uuid not null references public.asignaturas(id) on delete cascade,
  anio_id         uuid not null references public.anios_escolares(id) on delete cascade,
  horas_semanales int not null default 1 check (horas_semanales between 1 and 40),
  created_at      timestamptz not null default now(),
  unique (empleado_id, seccion_id, asignatura_id)
);

-- Documentos del empleado (bucket privado 'empleados').
create table if not exists public.empleado_documentos (
  id          uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  nombre      text not null,
  tipo        text,
  path        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_empleados_sede on public.empleados(sede_id);
create index if not exists idx_empleados_tipo on public.empleados(tipo);
create index if not exists idx_docsec_empleado on public.docente_secciones(empleado_id);
create index if not exists idx_docsec_seccion on public.docente_secciones(seccion_id);
create index if not exists idx_empdoc_empleado on public.empleado_documentos(empleado_id);

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at
  before update on public.empleados
  for each row execute function public.set_updated_at();

-- ── Storage privado para documentos y fotos de empleados ────────────────
insert into storage.buckets (id, name, public)
values ('empleados', 'empleados', false)
on conflict (id) do nothing;

drop policy if exists emp_docs_select on storage.objects;
create policy emp_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'empleados' and private.tiene_rol('director', 'secretaria'));

drop policy if exists emp_docs_insert on storage.objects;
create policy emp_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'empleados' and private.tiene_rol('director', 'secretaria'));

drop policy if exists emp_docs_update on storage.objects;
create policy emp_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'empleados' and private.tiene_rol('director', 'secretaria'));

drop policy if exists emp_docs_delete on storage.objects;
create policy emp_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'empleados' and private.tiene_rol('director', 'secretaria'));

-- ── RLS ─────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['empleados','docente_secciones','empleado_documentos'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- empleados: lectura staff; escritura dirección/secretaría.
drop policy if exists empleados_select on public.empleados;
create policy empleados_select on public.empleados
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists empleados_write on public.empleados;
create policy empleados_write on public.empleados
  for all to authenticated
  using (private.tiene_rol('director', 'secretaria'))
  with check (private.tiene_rol('director', 'secretaria'));

-- docente_secciones: lectura staff; escritura dirección/coordinación (académico).
drop policy if exists docsec_select on public.docente_secciones;
create policy docsec_select on public.docente_secciones
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists docsec_write on public.docente_secciones;
create policy docsec_write on public.docente_secciones
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

-- empleado_documentos: dirección/secretaría.
drop policy if exists empdoc_select on public.empleado_documentos;
create policy empdoc_select on public.empleado_documentos
  for select to authenticated
  using (private.tiene_rol('director', 'secretaria'));
drop policy if exists empdoc_write on public.empleado_documentos;
create policy empdoc_write on public.empleado_documentos
  for all to authenticated
  using (private.tiene_rol('director', 'secretaria'))
  with check (private.tiene_rol('director', 'secretaria'));

-- ── Semilla: ~20 docentes + personal + asignaciones ─────────────────────
do $$
declare
  v_sede uuid;
  v_anio uuid;
  nombres_m text[] := array['Juan','Carlos','Luis','Miguel','Pedro','Rafael',
    'José','Manuel','Fernando','Andrés','Julio','Ramón'];
  nombres_f text[] := array['María','Carmen','Ana','Rosa','Altagracia','Yulissa',
    'Massiel','Scarlet','Nicole','Paola','Esther','Juana'];
  apellidos text[] := array['Peralta','Rodríguez','Fernández','Martínez','Jiménez',
    'Reyes','Santana','Núñez','Guzmán','Mejía','Batista','Ramírez','Vásquez',
    'Ureña','Tavárez','Polanco','Almonte','Herrera','Matos','Bautista'];
  areas text[] := array['Lengua Española','Matemática','Ciencias Sociales',
    'Ciencias de la Naturaleza','Formación Integral Humana y Religiosa',
    'Educación Artística','Educación Física','Inglés','Francés'];
  titulos text[] := array['Licenciatura en Educación','Maestría en Educación',
    'Profesorado','Licenciatura en Educación Mención Letras'];
  docentes uuid[] := '{}';
  emp uuid;
  i int;
  nom text;
  rec record;
  idx int;
begin
  if exists (select 1 from public.empleados limit 1) then
    return;
  end if;

  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  -- Docentes
  for i in 1..20 loop
    if i % 2 = 0 then
      nom := nombres_f[1 + (i * 7) % array_length(nombres_f, 1)];
    else
      nom := nombres_m[1 + (i * 7) % array_length(nombres_m, 1)];
    end if;

    insert into public.empleados (
      sede_id, codigo, nombres, apellidos, cedula, tipo, cargo, telefono, email,
      fecha_ingreso, titulo_academico, estado)
    values (
      v_sede, 'DOC-' || lpad(i::text, 3, '0'),
      nom, apellidos[1 + (i * 5) % array_length(apellidos, 1)],
      lpad((30000000000 + i * 137)::text, 11, '0'),
      'docente',
      'Docente de ' || areas[1 + (i - 1) % array_length(areas, 1)],
      '809-' || lpad(((i * 111) % 1000)::text, 3, '0') || '-' ||
        lpad(((i * 333) % 10000)::text, 4, '0'),
      'docente' || i || '@escuela-demo.do',
      make_date(2013 + i % 11, 1 + i % 12, 1 + i % 27),
      titulos[1 + (i - 1) % array_length(titulos, 1)],
      case when i = 7 then 'licencia' else 'activo' end::public.estado_empleado)
    returning id into emp;
    docentes := array_append(docentes, emp);
  end loop;

  -- Personal administrativo / apoyo / directivo
  insert into public.empleados (sede_id, codigo, nombres, apellidos, cedula, tipo, cargo, fecha_ingreso, estado)
  values
    (v_sede, 'DIR-001', 'Altagracia', 'Espaillat', '00112345678', 'directivo', 'Directora General', date '2011-08-01', 'activo'),
    (v_sede, 'ADM-001', 'Rosa', 'Grullón', '00122345678', 'administrativo', 'Secretaria de Registro', date '2016-08-15', 'activo'),
    (v_sede, 'ADM-002', 'Manuel', 'Castillo', '00132345678', 'administrativo', 'Contabilidad y Caja', date '2017-01-10', 'activo'),
    (v_sede, 'ADM-003', 'Yohanna', 'Paredes', '00142345678', 'administrativo', 'Coordinadora Académica', date '2015-08-01', 'activo'),
    (v_sede, 'APY-001', 'Francisco', 'Del Orbe', '00152345678', 'apoyo', 'Conserjería', date '2018-09-01', 'activo'),
    (v_sede, 'APY-002', 'Juana', 'Cabrera', '00162345678', 'apoyo', 'Enfermería escolar', date '2019-08-20', 'activo')
  on conflict (codigo) do nothing;

  -- Asignaciones: cada asignatura del pénsum → docente por nivel y orden.
  for rec in
    select s.id as seccion_id, p.asignatura_id, p.horas_semanales, p.orden,
           n.codigo as nivel_codigo
    from public.secciones s
    join public.grados g on g.id = s.grado_id
    join public.niveles n on n.id = g.nivel_id
    join public.pensum p on p.grado_id = g.id
    where s.anio_id = v_anio and n.codigo in ('PRIMARIA', 'SECUNDARIA')
  loop
    idx := 1 + ((case when rec.nivel_codigo = 'SECUNDARIA' then 9 else 0 end)
                + (rec.orden - 1)) % array_length(docentes, 1);
    insert into public.docente_secciones (
      empleado_id, seccion_id, asignatura_id, anio_id, horas_semanales)
    values (docentes[idx], rec.seccion_id, rec.asignatura_id, v_anio, rec.horas_semanales)
    on conflict (empleado_id, seccion_id, asignatura_id) do nothing;
  end loop;
end $$;

commit;
