-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 2 — Estructura Académica                          ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Períodos P1–P4, niveles (Inicial/Primaria/Secundaria), grados,       ║
-- ║  jornadas, aulas, asignaturas, secciones, pénsum y ponderación de la  ║
-- ║  nota con validación de suma 100% a nivel de base de datos.           ║
-- ║  RLS + FORCE deny-all en cada tabla; escritura académica limitada.    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_evaluacion') then
    create type public.tipo_evaluacion as enum ('cualitativa', 'numerica');
  end if;
  if not exists (select 1 from pg_type where typname = 'ciclo_secundaria') then
    create type public.ciclo_secundaria as enum ('primer_ciclo', 'segundo_ciclo');
  end if;
  if not exists (select 1 from pg_type where typname = 'modalidad_academica') then
    create type public.modalidad_academica as enum
      ('general', 'academica', 'tecnico_profesional', 'artes');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_periodo') then
    create type public.estado_periodo as enum ('pendiente', 'en_curso', 'cerrado');
  end if;
end $$;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.periodos (
  id           uuid primary key default gen_random_uuid(),
  anio_id      uuid not null references public.anios_escolares(id) on delete cascade,
  nombre       text not null,
  orden        int not null,
  fecha_inicio date not null,
  fecha_fin    date not null,
  estado       public.estado_periodo not null default 'pendiente',
  created_at   timestamptz not null default now(),
  unique (anio_id, orden)
);

create table if not exists public.niveles (
  id              uuid primary key default gen_random_uuid(),
  sede_id         uuid not null references public.sedes(id) on delete cascade,
  nombre          text not null,
  codigo          text not null,
  orden           int not null,
  tipo_evaluacion public.tipo_evaluacion not null,
  created_at      timestamptz not null default now(),
  unique (sede_id, codigo)
);

create table if not exists public.grados (
  id         uuid primary key default gen_random_uuid(),
  nivel_id   uuid not null references public.niveles(id) on delete cascade,
  nombre     text not null,
  codigo     text not null,
  orden      int not null,
  ciclo      public.ciclo_secundaria,
  created_at timestamptz not null default now(),
  unique (nivel_id, codigo)
);

create table if not exists public.jornadas (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  nombre     text not null,
  codigo     text not null,
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  unique (sede_id, codigo)
);

create table if not exists public.aulas (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  nombre     text not null,
  codigo     text not null,
  capacidad  int not null default 30 check (capacidad > 0),
  ubicacion  text,
  created_at timestamptz not null default now(),
  unique (sede_id, codigo)
);

create table if not exists public.asignaturas (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  nombre     text not null,
  codigo     text not null,
  area       text,
  es_base    boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sede_id, codigo)
);

create table if not exists public.secciones (
  id         uuid primary key default gen_random_uuid(),
  anio_id    uuid not null references public.anios_escolares(id) on delete cascade,
  grado_id   uuid not null references public.grados(id) on delete cascade,
  nombre     text not null,
  jornada_id uuid not null references public.jornadas(id),
  aula_id    uuid references public.aulas(id) on delete set null,
  modalidad  public.modalidad_academica,
  cupo       int not null default 30 check (cupo > 0),
  activa     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (anio_id, grado_id, nombre, jornada_id)
);

-- Pénsum: asignaturas por grado con carga horaria.
create table if not exists public.pensum (
  id             uuid primary key default gen_random_uuid(),
  grado_id       uuid not null references public.grados(id) on delete cascade,
  asignatura_id  uuid not null references public.asignaturas(id) on delete cascade,
  horas_semanales int not null default 1 check (horas_semanales between 1 and 40),
  orden          int not null default 0,
  created_at     timestamptz not null default now(),
  unique (grado_id, asignatura_id)
);

-- Ponderación de la nota: esquema + componentes (deben sumar 100%).
create table if not exists public.esquemas_ponderacion (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  nivel_id   uuid references public.niveles(id) on delete cascade,
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sede_id, nombre)
);

create table if not exists public.ponderacion_componentes (
  id         uuid primary key default gen_random_uuid(),
  esquema_id uuid not null references public.esquemas_ponderacion(id) on delete cascade,
  nombre     text not null,
  codigo     text not null,
  peso       numeric(5,2) not null check (peso >= 0 and peso <= 100),
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  unique (esquema_id, codigo)
);

-- ── Validación de suma 100% (constraint diferida a nivel de BD) ─────────
create or replace function private.validar_suma_ponderacion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_esquema uuid;
  v_total numeric;
  v_existe boolean;
begin
  v_esquema := coalesce(new.esquema_id, old.esquema_id);

  -- Si el esquema fue eliminado por completo, no exigir suma.
  select exists(select 1 from public.esquemas_ponderacion where id = v_esquema)
    into v_existe;
  if not v_existe then
    return null;
  end if;

  select coalesce(sum(peso), 0) into v_total
  from public.ponderacion_componentes where esquema_id = v_esquema;

  if v_total <> 100 then
    raise exception
      'La ponderación debe sumar exactamente 100%%. Suma actual: %', v_total
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_ponderacion_suma on public.ponderacion_componentes;
create constraint trigger trg_ponderacion_suma
  after insert or update or delete on public.ponderacion_componentes
  deferrable initially deferred
  for each row execute function private.validar_suma_ponderacion();

-- Reemplazo transaccional de los componentes de un esquema. SECURITY INVOKER:
-- la autorización la impone la RLS (solo director/coordinador escriben). Todo
-- ocurre en una transacción para que la constraint diferida valide la suma
-- final = 100% una sola vez.
create or replace function public.reemplazar_ponderacion(
  p_esquema uuid,
  p_componentes jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c jsonb;
  i int := 0;
begin
  delete from public.ponderacion_componentes where esquema_id = p_esquema;
  for c in select * from jsonb_array_elements(p_componentes) loop
    i := i + 1;
    insert into public.ponderacion_componentes (esquema_id, nombre, codigo, peso, orden)
    values (
      p_esquema,
      c ->> 'nombre',
      upper(c ->> 'codigo'),
      (c ->> 'peso')::numeric,
      i
    );
  end loop;
end;
$$;

revoke all on function public.reemplazar_ponderacion(uuid, jsonb) from public, anon;
grant execute on function public.reemplazar_ponderacion(uuid, jsonb) to authenticated, service_role;

-- ── RLS: ACTIVADO + FORCE, deny-all salvo políticas ─────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'periodos','niveles','grados','jornadas','aulas','asignaturas',
    'secciones','pensum','esquemas_ponderacion','ponderacion_componentes'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- Lectura: cualquier usuario activo. Escritura: dirección/coordinación.
do $$
declare t text;
begin
  foreach t in array array[
    'periodos','niveles','grados','jornadas','aulas','asignaturas',
    'secciones','pensum','esquemas_ponderacion','ponderacion_componentes'
  ] loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.es_activo());',
      t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (private.tiene_rol(''director'',''coordinador'')) with check (private.tiene_rol(''director'',''coordinador''));',
      t, t);
  end loop;
end $$;

-- ── Semilla (idempotente) ───────────────────────────────────────────────
-- Períodos del año activo: P1/P2 cerrados, P3 en curso, P4 pendiente.
insert into public.periodos (anio_id, nombre, orden, fecha_inicio, fecha_fin, estado)
select a.id, v.nombre, v.orden, v.ini, v.fin, v.estado::public.estado_periodo
from public.anios_escolares a
cross join (values
  ('Primer Período',  1, date '2025-08-18', date '2025-10-31', 'cerrado'),
  ('Segundo Período', 2, date '2025-11-03', date '2026-01-23', 'cerrado'),
  ('Tercer Período',  3, date '2026-01-26', date '2026-04-10', 'en_curso'),
  ('Cuarto Período',  4, date '2026-04-13', date '2026-06-26', 'pendiente')
) as v(nombre, orden, ini, fin, estado)
where a.nombre = '2025–2026'
on conflict (anio_id, orden) do nothing;

-- Niveles.
insert into public.niveles (sede_id, nombre, codigo, orden, tipo_evaluacion)
select s.id, v.nombre, v.codigo, v.orden, v.te::public.tipo_evaluacion
from public.sedes s
cross join (values
  ('Nivel Inicial', 'INICIAL', 1, 'cualitativa'),
  ('Primaria',      'PRIMARIA', 2, 'numerica'),
  ('Secundaria',    'SECUNDARIA', 3, 'numerica')
) as v(nombre, codigo, orden, te)
where s.codigo = 'SEDE-01'
on conflict (sede_id, codigo) do nothing;

-- Grados de Inicial.
insert into public.grados (nivel_id, nombre, codigo, orden)
select n.id, v.nombre, v.codigo, v.orden
from public.niveles n
join public.sedes s on s.id = n.sede_id and s.codigo = 'SEDE-01'
cross join (values
  ('Pre-Kínder', 'INI-PREK', 1),
  ('Kínder', 'INI-KIN', 2),
  ('Pre-Primario', 'INI-PREP', 3)
) as v(nombre, codigo, orden)
where n.codigo = 'INICIAL'
on conflict (nivel_id, codigo) do nothing;

-- Grados de Primaria (1ro–6to).
insert into public.grados (nivel_id, nombre, codigo, orden)
select n.id, v.nombre, 'PRI-' || v.orden, v.orden
from public.niveles n
join public.sedes s on s.id = n.sede_id and s.codigo = 'SEDE-01'
cross join (values
  ('1ro', 1), ('2do', 2), ('3ro', 3), ('4to', 4), ('5to', 5), ('6to', 6)
) as v(nombre, orden)
where n.codigo = 'PRIMARIA'
on conflict (nivel_id, codigo) do nothing;

-- Grados de Secundaria (1ro–6to, con ciclo).
insert into public.grados (nivel_id, nombre, codigo, orden, ciclo)
select n.id, v.nombre, 'SEC-' || v.orden, v.orden,
  (case when v.orden <= 3 then 'primer_ciclo' else 'segundo_ciclo' end)::public.ciclo_secundaria
from public.niveles n
join public.sedes s on s.id = n.sede_id and s.codigo = 'SEDE-01'
cross join (values
  ('1ro', 1), ('2do', 2), ('3ro', 3), ('4to', 4), ('5to', 5), ('6to', 6)
) as v(nombre, orden)
where n.codigo = 'SECUNDARIA'
on conflict (nivel_id, codigo) do nothing;

-- Jornadas.
insert into public.jornadas (sede_id, nombre, codigo, orden)
select s.id, v.nombre, v.codigo, v.orden
from public.sedes s
cross join (values
  ('Matutina', 'MAT', 1),
  ('Vespertina', 'VES', 2),
  ('Tanda Extendida', 'EXT', 3)
) as v(nombre, codigo, orden)
where s.codigo = 'SEDE-01'
on conflict (sede_id, codigo) do nothing;

-- Aulas.
insert into public.aulas (sede_id, nombre, codigo, capacidad, ubicacion)
select s.id, 'Aula ' || lpad(g.n::text, 2, '0'), 'A' || lpad(g.n::text, 2, '0'),
  30, (case when g.n <= 6 then 'Pabellón A' when g.n <= 12 then 'Pabellón B' else 'Pabellón C' end)
from public.sedes s
cross join generate_series(1, 16) as g(n)
where s.codigo = 'SEDE-01'
on conflict (sede_id, codigo) do nothing;

-- Asignaturas base MINERD.
insert into public.asignaturas (sede_id, nombre, codigo, area, es_base)
select s.id, v.nombre, v.codigo, v.area, true
from public.sedes s
cross join (values
  ('Lengua Española', 'LEN', 'Lenguas'),
  ('Matemática', 'MAT', 'Matemática'),
  ('Ciencias Sociales', 'CSO', 'Ciencias Sociales'),
  ('Ciencias de la Naturaleza', 'CNA', 'Ciencias de la Naturaleza'),
  ('Formación Integral Humana y Religiosa', 'FIHR', 'Formación Humana'),
  ('Educación Artística', 'ART', 'Artes'),
  ('Educación Física', 'EFI', 'Educación Física'),
  ('Inglés', 'ING', 'Lenguas Extranjeras'),
  ('Francés', 'FRA', 'Lenguas Extranjeras')
) as v(nombre, codigo, area)
where s.codigo = 'SEDE-01'
on conflict (sede_id, codigo) do nothing;

-- Pénsum: asignaturas base a cada grado de Primaria y Secundaria.
insert into public.pensum (grado_id, asignatura_id, horas_semanales, orden)
select g.id, a.id,
  (case a.codigo
    when 'LEN' then 6 when 'MAT' then 6 when 'CSO' then 4 when 'CNA' then 4
    when 'ING' then 3 when 'FRA' then 2 when 'EFI' then 2 when 'ART' then 2
    else 2 end),
  row_number() over (partition by g.id order by a.codigo)::int
from public.grados g
join public.niveles n on n.id = g.nivel_id
join public.sedes s on s.id = n.sede_id and s.codigo = 'SEDE-01'
join public.asignaturas a on a.sede_id = s.id
where n.codigo in ('PRIMARIA', 'SECUNDARIA')
on conflict (grado_id, asignatura_id) do nothing;

-- Esquema de ponderación por defecto (suma 100%).
insert into public.esquemas_ponderacion (sede_id, nombre, activo)
select s.id, 'Ponderación estándar', true
from public.sedes s where s.codigo = 'SEDE-01'
on conflict (sede_id, nombre) do nothing;

insert into public.ponderacion_componentes (esquema_id, nombre, codigo, peso, orden)
select e.id, v.nombre, v.codigo, v.peso, v.orden
from public.esquemas_ponderacion e
join public.sedes s on s.id = e.sede_id and s.codigo = 'SEDE-01'
cross join (values
  ('Actividades y trabajos', 'ACT', 25.00, 1),
  ('Pruebas parciales', 'PAR', 25.00, 2),
  ('Prueba de período', 'PER', 30.00, 3),
  ('Actitudes y valores', 'AyV', 20.00, 4)
) as v(nombre, codigo, peso, orden)
where e.nombre = 'Ponderación estándar'
on conflict (esquema_id, codigo) do nothing;

-- Secciones de ejemplo (año activo, jornada matutina).
insert into public.secciones (anio_id, grado_id, nombre, jornada_id, aula_id, modalidad, cupo)
select an.id, g.id, sec.nombre, j.id, au.id,
  (case when g.ciclo = 'segundo_ciclo' then 'academica' else null end)::public.modalidad_academica,
  30
from public.anios_escolares an
join public.sedes s on s.id = an.sede_id and s.codigo = 'SEDE-01'
join public.grados g on true
join public.niveles n on n.id = g.nivel_id and n.sede_id = s.id
join public.jornadas j on j.sede_id = s.id and j.codigo = 'MAT'
join public.aulas au on au.sede_id = s.id and au.codigo = 'A' || lpad(g.orden::text, 2, '0')
cross join (values ('A')) as sec(nombre)
where an.nombre = '2025–2026'
  and n.codigo in ('INICIAL', 'PRIMARIA', 'SECUNDARIA')
on conflict (anio_id, grado_id, nombre, jornada_id) do nothing;

commit;
