-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 3 — Matrícula y Expediente del Estudiante         ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Ficha del estudiante (RNE, salud, foto privada), tutores y núcleo    ║
-- ║  familiar (hermanos para descuentos), matrícula/reinscripción e       ║
-- ║  historial. RLS + FORCE deny-all; foto en bucket privado por signed   ║
-- ║  URL. Semilla dominicana ~180 estudiantes.                            ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sexo_estudiante') then
    create type public.sexo_estudiante as enum ('M', 'F');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_estudiante') then
    create type public.estado_estudiante as enum
      ('activo', 'retirado', 'egresado', 'transferido');
  end if;
  if not exists (select 1 from pg_type where typname = 'parentesco') then
    create type public.parentesco as enum
      ('padre', 'madre', 'tutor_legal', 'abuelo', 'abuela', 'tio', 'tia', 'otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_documento_est') then
    create type public.tipo_documento_est as enum ('acta', 'cedula', 'pasaporte');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_matricula') then
    create type public.tipo_matricula as enum ('inscripcion', 'reinscripcion');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_matricula') then
    create type public.estado_matricula as enum ('activa', 'retirada', 'completada');
  end if;
end $$;

-- ── Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.familias (
  id                uuid primary key default gen_random_uuid(),
  sede_id           uuid not null references public.sedes(id) on delete cascade,
  apellido_familiar text not null,
  notas             text,
  created_at        timestamptz not null default now()
);

create table if not exists public.tutores (
  id          uuid primary key default gen_random_uuid(),
  sede_id     uuid not null references public.sedes(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete set null,
  nombres     text not null,
  apellidos   text not null,
  cedula      text,
  telefono    text,
  email       text,
  ocupacion   text,
  direccion   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.estudiantes (
  id                  uuid primary key default gen_random_uuid(),
  sede_id             uuid not null references public.sedes(id) on delete cascade,
  familia_id          uuid references public.familias(id) on delete set null,
  profile_id          uuid references public.profiles(id) on delete set null,
  codigo              text not null unique,
  rne                 text unique,
  nombres             text not null,
  apellidos           text not null,
  sexo                public.sexo_estudiante not null,
  fecha_nacimiento    date not null,
  lugar_nacimiento    text,
  nacionalidad        text not null default 'Dominicana',
  tipo_documento      public.tipo_documento_est not null default 'acta',
  numero_documento    text,
  direccion           text,
  tipo_sangre         text,
  alergias            text,
  condiciones_medicas text,
  observaciones       text,
  foto_path           text,
  estado              public.estado_estudiante not null default 'activo',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Vínculo estudiante ↔ tutor (parentesco, permisos de retiro y emergencia).
create table if not exists public.estudiante_tutores (
  id                    uuid primary key default gen_random_uuid(),
  estudiante_id         uuid not null references public.estudiantes(id) on delete cascade,
  tutor_id              uuid not null references public.tutores(id) on delete cascade,
  parentesco            public.parentesco not null,
  es_contacto_emergencia boolean not null default false,
  autorizado_retirar    boolean not null default false,
  principal             boolean not null default false,
  created_at            timestamptz not null default now(),
  unique (estudiante_id, tutor_id)
);

-- Matrícula / reinscripción por año escolar (historial).
create table if not exists public.matriculas (
  id            uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  anio_id       uuid not null references public.anios_escolares(id) on delete cascade,
  seccion_id    uuid not null references public.secciones(id),
  tipo          public.tipo_matricula not null default 'inscripcion',
  fecha         date not null default current_date,
  estado        public.estado_matricula not null default 'activa',
  created_at    timestamptz not null default now(),
  unique (estudiante_id, anio_id)
);

-- Índices de apoyo.
create index if not exists idx_estudiantes_sede on public.estudiantes(sede_id);
create index if not exists idx_estudiantes_familia on public.estudiantes(familia_id);
create index if not exists idx_estudiantes_estado on public.estudiantes(estado);
create index if not exists idx_est_tutores_est on public.estudiante_tutores(estudiante_id);
create index if not exists idx_est_tutores_tut on public.estudiante_tutores(tutor_id);
create index if not exists idx_matriculas_est on public.matriculas(estudiante_id);
create index if not exists idx_matriculas_seccion on public.matriculas(seccion_id);

drop trigger if exists trg_estudiantes_updated_at on public.estudiantes;
create trigger trg_estudiantes_updated_at
  before update on public.estudiantes
  for each row execute function public.set_updated_at();

-- ── Storage privado para fotos de estudiantes ───────────────────────────
insert into storage.buckets (id, name, public)
values ('estudiantes', 'estudiantes', false)
on conflict (id) do nothing;

drop policy if exists est_fotos_select on storage.objects;
create policy est_fotos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estudiantes'
    and private.tiene_rol('director', 'coordinador', 'secretaria')
  );

drop policy if exists est_fotos_insert on storage.objects;
create policy est_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estudiantes'
    and private.tiene_rol('director', 'secretaria')
  );

drop policy if exists est_fotos_update on storage.objects;
create policy est_fotos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'estudiantes'
    and private.tiene_rol('director', 'secretaria')
  );

drop policy if exists est_fotos_delete on storage.objects;
create policy est_fotos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'estudiantes'
    and private.tiene_rol('director', 'secretaria')
  );

-- ── RLS: ACTIVADO + FORCE ───────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'familias','tutores','estudiantes','estudiante_tutores','matriculas'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- Lectura: dirección/coordinación/secretaría. Escritura: dirección/secretaría
-- (Matrícula y Registro es competencia de Secretaría).
do $$
declare t text;
begin
  foreach t in array array[
    'familias','tutores','estudiantes','estudiante_tutores','matriculas'
  ] loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.tiene_rol(''director'',''coordinador'',''secretaria''));',
      t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (private.tiene_rol(''director'',''secretaria'')) with check (private.tiene_rol(''director'',''secretaria''));',
      t, t);
  end loop;
end $$;

-- ── Semilla dominicana ~180 estudiantes, con hermanos y tutores ─────────
do $$
declare
  v_sede uuid;
  v_anio uuid;
  nombres_m text[] := array['Juan','José','Luis','Carlos','Miguel','Pedro','Rafael',
    'Francisco','Manuel','Ramón','Ángel','Fernando','Julio','Héctor','Eduardo',
    'Andrés','Diego','Gabriel','Alejandro','Emmanuel'];
  nombres_f text[] := array['María','Ana','Carmen','Rosa','Juana','Altagracia','Yulissa',
    'Wendy','Massiel','Yohaira','Scarlet','Génesis','Nicole','Camila','Valentina',
    'Isabella','Paola','Dariana','Yeimy','Esther'];
  apellidos text[] := array['Peralta','Rodríguez','Fernández','Martínez','Jiménez','Reyes',
    'Santana','Núñez','De la Cruz','Guzmán','Mejía','Batista','Encarnación','Féliz',
    'Ramírez','Vásquez','Disla','Ureña','Tavárez','Polanco','Almonte','Bautista',
    'Herrera','Matos','Then'];
  lugares text[] := array['Santiago','Santo Domingo','La Vega','San Francisco de Macorís',
    'Puerto Plata','Moca'];
  sangres text[] := array['O+','A+','B+','O-','A-','AB+'];
  sizes int[] := array[1,2,1,3,1,2,1,1,2,3,1,2,1,1,2];
  secs uuid[];
  ords int[];
  n_sec int;
  total int := 0;
  objetivo int := 180;
  fam uuid;
  fam_size int;
  si int := 0;
  child int;
  est uuid;
  tut_padre uuid;
  tut_madre uuid;
  ap1 text; ap2 text;
  sec_ptr int := 0;
  sec_id uuid; g_ord int;
  sx public.sexo_estudiante; nom text; nac date;
  est_estado public.estado_estudiante;
begin
  -- Idempotencia: si ya hay estudiantes, no re-sembrar.
  if exists (select 1 from public.estudiantes limit 1) then
    return;
  end if;

  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  select id into v_anio from public.anios_escolares where nombre = '2025–2026';

  select array_agg(s.id order by n.orden, g.orden),
         array_agg(
           (case n.codigo when 'INICIAL' then g.orden
                          when 'PRIMARIA' then g.orden + 3
                          else g.orden + 9 end)
           order by n.orden, g.orden)
    into secs, ords
  from public.secciones s
  join public.grados g on g.id = s.grado_id
  join public.niveles n on n.id = g.nivel_id
  where s.anio_id = v_anio;

  n_sec := array_length(secs, 1);

  while total < objetivo loop
    ap1 := apellidos[1 + (total * 3) % array_length(apellidos, 1)];
    ap2 := apellidos[1 + (total * 5 + 2) % array_length(apellidos, 1)];

    insert into public.familias (sede_id, apellido_familiar)
    values (v_sede, ap1 || ' ' || ap2)
    returning id into fam;

    insert into public.tutores (sede_id, nombres, apellidos, cedula, telefono, ocupacion)
    values (v_sede,
      nombres_m[1 + (total * 2) % array_length(nombres_m, 1)], ap1 || ' ' || ap2,
      lpad((100000000 + (total * 97 + 31) % 899999999)::text, 11, '0'),
      '809-' || lpad(((total * 131) % 1000)::text, 3, '0') || '-' ||
        lpad(((total * 777) % 10000)::text, 4, '0'),
      'Comerciante')
    returning id into tut_padre;

    insert into public.tutores (sede_id, nombres, apellidos, cedula, telefono, ocupacion)
    values (v_sede,
      nombres_f[1 + (total * 2) % array_length(nombres_f, 1)], ap1 || ' ' || ap2,
      lpad((100000000 + (total * 89 + 7) % 899999999)::text, 11, '0'),
      '829-' || lpad(((total * 53) % 1000)::text, 3, '0') || '-' ||
        lpad(((total * 311) % 10000)::text, 4, '0'),
      'Docente')
    returning id into tut_madre;

    si := si + 1;
    fam_size := sizes[1 + (si - 1) % array_length(sizes, 1)];

    for child in 1..fam_size loop
      exit when total >= objetivo;
      total := total + 1;
      sec_id := secs[1 + (sec_ptr % n_sec)];
      g_ord := ords[1 + (sec_ptr % n_sec)];
      sec_ptr := sec_ptr + 1;

      if total % 2 = 0 then
        sx := 'F'; nom := nombres_f[1 + (total * 7) % array_length(nombres_f, 1)];
      else
        sx := 'M'; nom := nombres_m[1 + (total * 7) % array_length(nombres_m, 1)];
      end if;

      nac := make_date(2026 - (3 + g_ord), 1 + (total * 13) % 12, 1 + (total * 17) % 28);
      est_estado := case
        when total % 45 = 0 then 'retirado'
        when total % 60 = 0 then 'transferido'
        else 'activo' end::public.estado_estudiante;

      insert into public.estudiantes (
        sede_id, familia_id, codigo, rne, nombres, apellidos, sexo, fecha_nacimiento,
        lugar_nacimiento, nacionalidad, tipo_documento, numero_documento, direccion,
        tipo_sangre, alergias, condiciones_medicas, estado)
      values (
        v_sede, fam, 'EST-' || lpad(total::text, 4, '0'),
        lpad((7000000000 + total * 7)::text, 11, '0'),
        nom, ap1 || ' ' || ap2, sx, nac,
        lugares[1 + total % array_length(lugares, 1)], 'Dominicana',
        'acta', lpad((total * 123457 % 900000000 + 40000000000)::text, 11, '0'),
        'Calle ' || (1 + total % 40) || ' #' || (1 + total % 90) || ', ' ||
          lugares[1 + total % array_length(lugares, 1)],
        sangres[1 + total % array_length(sangres, 1)],
        case when total % 9 = 0 then 'Polvo y maní' else null end,
        case when total % 14 = 0 then 'Asma leve' else null end,
        est_estado)
      returning id into est;

      insert into public.estudiante_tutores
        (estudiante_id, tutor_id, parentesco, es_contacto_emergencia, autorizado_retirar, principal)
      values (est, tut_padre, 'padre', true, true, true);
      insert into public.estudiante_tutores
        (estudiante_id, tutor_id, parentesco, es_contacto_emergencia, autorizado_retirar, principal)
      values (est, tut_madre, 'madre', true, true, false);

      insert into public.matriculas (estudiante_id, anio_id, seccion_id, tipo, fecha, estado)
      values (est, v_anio, sec_id, 'inscripcion', date '2025-08-05',
        case when est_estado = 'activo' then 'activa' else 'retirada' end::public.estado_matricula);
    end loop;
  end loop;
end $$;

commit;
