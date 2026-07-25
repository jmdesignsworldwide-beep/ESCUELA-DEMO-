-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA 18 — Inventario y Biblioteca                    ║
-- ║  Bloque único. Aplicar vía Supabase Management API (PAT temporal).    ║
-- ║                                                                        ║
-- ║  Inventario de activos/insumos y catálogo bibliotecario con préstamos ║
-- ║  y devoluciones. La disponibilidad se valida EN SERVIDOR (no se puede ║
-- ║  prestar más ejemplares de los existentes).                           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Tipos ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_inventario') then
    create type public.categoria_inventario as enum
      ('mobiliario', 'equipo', 'tecnologia', 'insumo', 'otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_activo') then
    create type public.estado_activo as enum ('bueno', 'regular', 'malo', 'baja');
  end if;
end $$;

-- ── Inventario de activos / insumos ────────────────────────────────────
create table if not exists public.inventario_items (
  id             uuid primary key default gen_random_uuid(),
  sede_id        uuid not null references public.sedes(id) on delete cascade,
  codigo         text not null,
  nombre         text not null,
  categoria      public.categoria_inventario not null default 'otro',
  cantidad       int not null default 1 check (cantidad >= 0),
  unidad         text not null default 'unidad',
  ubicacion      text,
  estado         public.estado_activo not null default 'bueno',
  valor_unitario numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (sede_id, codigo)
);

drop trigger if exists trg_inv_updated_at on public.inventario_items;
create trigger trg_inv_updated_at
  before update on public.inventario_items
  for each row execute function public.set_updated_at();

-- ── Catálogo de biblioteca ─────────────────────────────────────────────
create table if not exists public.libros (
  id               uuid primary key default gen_random_uuid(),
  sede_id          uuid not null references public.sedes(id) on delete cascade,
  isbn             text,
  titulo           text not null,
  autor            text,
  categoria        text,
  ejemplares_total int not null default 1 check (ejemplares_total >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_libros_updated_at on public.libros;
create trigger trg_libros_updated_at
  before update on public.libros
  for each row execute function public.set_updated_at();

-- ── Préstamos ───────────────────────────────────────────────────────────
create table if not exists public.prestamos (
  id            uuid primary key default gen_random_uuid(),
  libro_id      uuid not null references public.libros(id) on delete cascade,
  estudiante_id uuid references public.estudiantes(id) on delete set null,
  prestatario   text not null,
  fecha         date not null default current_date,
  vence         date,
  devuelto_at   timestamptz,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_prestamos_libro on public.prestamos(libro_id);
create index if not exists idx_prestamos_activos
  on public.prestamos(libro_id) where devuelto_at is null;

-- ── RLS (dirección/secretaría gestionan; coordinación consulta) ────────
do $$
declare t text;
begin
  foreach t in array array['inventario_items','libros','prestamos'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.tiene_rol(''director'',''secretaria'',''coordinador''));',
      t, t);
    execute format('drop policy if exists %I_write on public.%I;', t, t);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (private.tiene_rol(''director'',''secretaria'')) with check (private.tiene_rol(''director'',''secretaria''));',
      t, t);
  end loop;
end $$;

-- ── RPC: catálogo con disponibilidad (total − prestados activos) ───────
create or replace function public.catalogo_biblioteca()
returns table (
  id uuid, titulo text, autor text, categoria text,
  ejemplares_total int, prestados bigint, disponibles bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.id, l.titulo, l.autor, l.categoria, l.ejemplares_total,
    coalesce(p.activos, 0),
    l.ejemplares_total - coalesce(p.activos, 0)
  from public.libros l
  left join (
    select libro_id, count(*) as activos
    from public.prestamos where devuelto_at is null
    group by libro_id
  ) p on p.libro_id = l.id
  order by l.titulo;
$$;
revoke all on function public.catalogo_biblioteca() from public, anon;
grant execute on function public.catalogo_biblioteca() to authenticated, service_role;

-- ── RPC: registrar préstamo (valida disponibilidad en servidor) ────────
create or replace function public.registrar_prestamo(
  p_libro uuid, p_prestatario text, p_estudiante uuid, p_vence date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_total int; v_activos int; v_id uuid;
begin
  select ejemplares_total into v_total from public.libros where id = p_libro;
  if v_total is null then raise exception 'Libro no encontrado.'; end if;

  select count(*) into v_activos
    from public.prestamos where libro_id = p_libro and devuelto_at is null;
  if v_activos >= v_total then
    raise exception 'No hay ejemplares disponibles de este libro.'
      using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_prestatario), '') = '' then
    raise exception 'Indica a quién se presta.';
  end if;

  insert into public.prestamos (libro_id, estudiante_id, prestatario, vence, registrado_por)
  values (p_libro, p_estudiante, p_prestatario, p_vence, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.registrar_prestamo(uuid, text, uuid, date) from public, anon;
grant execute on function public.registrar_prestamo(uuid, text, uuid, date) to authenticated, service_role;

-- ── RPC: registrar devolución ──────────────────────────────────────────
create or replace function public.registrar_devolucion(p_prestamo uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_dev timestamptz;
begin
  select devuelto_at into v_dev from public.prestamos where id = p_prestamo;
  if not found then raise exception 'Préstamo no encontrado.'; end if;
  if v_dev is not null then raise exception 'El préstamo ya fue devuelto.'; end if;
  update public.prestamos set devuelto_at = now() where id = p_prestamo;
end;
$$;
revoke all on function public.registrar_devolucion(uuid) from public, anon;
grant execute on function public.registrar_devolucion(uuid) to authenticated, service_role;

-- ── Semilla ─────────────────────────────────────────────────────────────
do $$
declare
  v_sede uuid; v_libro1 uuid; v_libro2 uuid; v_est uuid;
begin
  select id into v_sede from public.sedes where codigo = 'SEDE-01';
  if v_sede is null then return; end if;

  -- Inventario.
  if not exists (select 1 from public.inventario_items where sede_id = v_sede) then
    insert into public.inventario_items
      (sede_id, codigo, nombre, categoria, cantidad, unidad, ubicacion, estado, valor_unitario)
    values
      (v_sede, 'INV-001', 'Pupitres unipersonales', 'mobiliario', 180, 'unidad', 'Aulas', 'bueno', 2500),
      (v_sede, 'INV-002', 'Pizarras acrílicas', 'mobiliario', 14, 'unidad', 'Aulas', 'bueno', 3500),
      (v_sede, 'INV-003', 'Proyectores', 'tecnologia', 6, 'unidad', 'Audiovisuales', 'regular', 22000),
      (v_sede, 'INV-004', 'Computadoras de laboratorio', 'tecnologia', 20, 'unidad', 'Laboratorio', 'bueno', 28000),
      (v_sede, 'INV-005', 'Resmas de papel', 'insumo', 45, 'resma', 'Almacén', 'bueno', 320),
      (v_sede, 'INV-006', 'Botiquín de primeros auxilios', 'equipo', 3, 'unidad', 'Enfermería', 'bueno', 4500);
  end if;

  -- Biblioteca.
  if not exists (select 1 from public.libros where sede_id = v_sede) then
    insert into public.libros (sede_id, isbn, titulo, autor, categoria, ejemplares_total)
    values
      (v_sede, '978-8420471839', 'Cien años de soledad', 'Gabriel García Márquez', 'Literatura', 5)
      returning id into v_libro1;
    insert into public.libros (sede_id, isbn, titulo, autor, categoria, ejemplares_total)
    values
      (v_sede, '978-9945000000', 'La Mañosa', 'Juan Bosch', 'Literatura dominicana', 4)
      returning id into v_libro2;
    insert into public.libros (sede_id, titulo, autor, categoria, ejemplares_total)
    values
      (v_sede, 'Matemática 5to grado', 'MINERD', 'Texto escolar', 40),
      (v_sede, 'Diccionario de la lengua española', 'RAE', 'Referencia', 8),
      (v_sede, 'El Principito', 'Antoine de Saint-Exupéry', 'Literatura infantil', 6);

    select id into v_est from public.estudiantes where estado = 'activo' order by codigo limit 1;

    -- Un préstamo activo y uno ya devuelto.
    perform public.registrar_prestamo(v_libro1, 'Biblioteca — préstamo interno', v_est, current_date + 15);
    insert into public.prestamos (libro_id, prestatario, fecha, vence, devuelto_at)
    values (v_libro2, 'Docente de Lengua Española', current_date - 20, current_date - 6, now() - interval '5 days');
  end if;
end $$;

commit;
