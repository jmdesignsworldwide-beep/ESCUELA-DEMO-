-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · TANDA E — Ciclo de vida del estudiante                  ║
-- ║  Aplicar vía Management API (PAT temporal).                          ║
-- ║                                                                        ║
-- ║  Estados: activo / inactivo / retirado / egresado / transferido.      ║
-- ║  Retiro/inactivación/egreso/transferencia con MOTIVO obligatorio.     ║
-- ║  Bitácora de movimientos append-only. Convalidación de notas para     ║
-- ║  transferencias entrantes. RNE ya existe (buscable en la UI).         ║
-- ║  Fort Knox: RLS + FORCE, movimientos inmutables, cambios de estado    ║
-- ║  atómicos vía RPC con guardia de rol y registro en bitácora.          ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Nuevo estado (fuera de transacción: ADD VALUE no se puede usar en la
-- misma transacción en que se crea).
alter type public.estado_estudiante add value if not exists 'inactivo';

begin;

-- ══════════════════════════════════════════════════════════════════════
--  Bitácora de movimientos del estudiante (append-only)
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.estudiante_movimientos (
  id              uuid primary key default gen_random_uuid(),
  estudiante_id   uuid not null references public.estudiantes(id) on delete cascade,
  tipo            text not null check (tipo in (
                    'retiro', 'reingreso', 'egreso', 'inactivacion',
                    'reactivacion', 'transferencia_entrante', 'transferencia_salida')),
  estado_anterior text,
  estado_nuevo    text,
  motivo          text,
  fecha           date not null default current_date,
  registrado_por  uuid default auth.uid(),
  created_at      timestamptz not null default now()
);
create index if not exists idx_mov_estudiante
  on public.estudiante_movimientos(estudiante_id, created_at desc);

-- Inmutabilidad append-only (no update/delete).
create or replace function private.bloquear_mov_estudiante()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Los movimientos del estudiante son inmutables (append-only).'
    using errcode = 'insufficient_privilege';
end;
$$;
revoke all on function private.bloquear_mov_estudiante() from public, anon, authenticated;

drop trigger if exists trg_mov_inmutable on public.estudiante_movimientos;
create trigger trg_mov_inmutable
  before update or delete on public.estudiante_movimientos
  for each row execute function private.bloquear_mov_estudiante();

-- ══════════════════════════════════════════════════════════════════════
--  Convalidación de notas (transferencias entrantes)
-- ══════════════════════════════════════════════════════════════════════
create table if not exists public.convalidaciones (
  id             uuid primary key default gen_random_uuid(),
  estudiante_id  uuid not null references public.estudiantes(id) on delete cascade,
  colegio_origen text not null,
  anio_origen    text,
  grado          text,
  asignatura     text not null,
  nota           numeric(5,2) not null check (nota >= 0 and nota <= 100),
  registrado_por uuid default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists idx_conv_estudiante
  on public.convalidaciones(estudiante_id);

-- ══════════════════════════════════════════════════════════════════════
--  RLS + FORCE
-- ══════════════════════════════════════════════════════════════════════
alter table public.estudiante_movimientos enable row level security;
alter table public.estudiante_movimientos force row level security;
alter table public.convalidaciones enable row level security;
alter table public.convalidaciones force row level security;

drop policy if exists mov_select on public.estudiante_movimientos;
create policy mov_select on public.estudiante_movimientos
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists mov_insert on public.estudiante_movimientos;
create policy mov_insert on public.estudiante_movimientos
  for insert to authenticated
  with check (private.tiene_rol('director', 'coordinador', 'secretaria'));

drop policy if exists conv_select on public.convalidaciones;
create policy conv_select on public.convalidaciones
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'));
drop policy if exists conv_write on public.convalidaciones;
create policy conv_write on public.convalidaciones
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria'))
  with check (private.tiene_rol('director', 'coordinador', 'secretaria'));

-- ══════════════════════════════════════════════════════════════════════
--  RPC — cambio de estado atómico (estado + matrícula + movimiento)
-- ══════════════════════════════════════════════════════════════════════
create or replace function private.cambiar_estado_estudiante(
  p_est uuid, p_estado text, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_anterior text; v_tipo text;
begin
  if not private.tiene_rol('director', 'coordinador', 'secretaria') then
    raise exception 'No autorizado.' using errcode = 'insufficient_privilege';
  end if;
  if p_estado not in ('activo', 'inactivo', 'retirado', 'egresado', 'transferido') then
    raise exception 'Estado no válido.' using errcode = 'check_violation';
  end if;

  select estado::text into v_anterior from public.estudiantes where id = p_est;
  if v_anterior is null then
    raise exception 'Estudiante no encontrado.' using errcode = 'no_data_found';
  end if;
  if v_anterior = p_estado then
    raise exception 'El estudiante ya está en ese estado.' using errcode = 'check_violation';
  end if;

  -- Motivo obligatorio en toda salida o inactivación.
  if p_estado in ('retirado', 'inactivo', 'transferido', 'egresado')
     and length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'El motivo es obligatorio (mínimo 5 caracteres).'
      using errcode = 'check_violation';
  end if;

  update public.estudiantes
    set estado = p_estado::public.estado_estudiante
    where id = p_est;

  -- Sincroniza la matrícula activa según el destino.
  if p_estado = 'egresado' then
    update public.matriculas set estado = 'completada'
      where estudiante_id = p_est and estado = 'activa';
  elsif p_estado in ('retirado', 'inactivo', 'transferido') then
    update public.matriculas set estado = 'retirada'
      where estudiante_id = p_est and estado = 'activa';
  end if;

  v_tipo := case p_estado
    when 'retirado' then 'retiro'
    when 'egresado' then 'egreso'
    when 'inactivo' then 'inactivacion'
    when 'transferido' then 'transferencia_salida'
    when 'activo' then (case when v_anterior = 'inactivo' then 'reactivacion' else 'reingreso' end)
  end;

  insert into public.estudiante_movimientos
    (estudiante_id, tipo, estado_anterior, estado_nuevo, motivo)
  values (p_est, v_tipo, v_anterior, p_estado, nullif(trim(coalesce(p_motivo, '')), ''));

  perform private.registrar_bitacora(
    'cambio_estado_estudiante', 'estudiantes', p_est::text,
    jsonb_build_object('anterior', v_anterior, 'nuevo', p_estado, 'motivo', p_motivo));
end;
$$;
revoke all on function private.cambiar_estado_estudiante(uuid, text, text) from public, anon;
grant execute on function private.cambiar_estado_estudiante(uuid, text, text) to authenticated, service_role;

-- Wrapper público INVOKER (Security Advisor limpio).
create or replace function public.cambiar_estado_estudiante(
  p_est uuid, p_estado text, p_motivo text)
returns void language sql security invoker set search_path = ''
as $$ select private.cambiar_estado_estudiante(p_est, p_estado, p_motivo); $$;
revoke all on function public.cambiar_estado_estudiante(uuid, text, text) from public, anon;
grant execute on function public.cambiar_estado_estudiante(uuid, text, text) to authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════
--  SEMILLA — movimientos de los estudiantes ya retirados/transferidos +
--  convalidaciones de ejemplo para los transferidos (transferencia entrante).
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (select 1 from public.estudiante_movimientos limit 1) then
    insert into public.estudiante_movimientos
      (estudiante_id, tipo, estado_anterior, estado_nuevo, motivo, fecha)
    select e.id,
      case when e.estado::text = 'retirado' then 'retiro' else 'transferencia_entrante' end,
      case when e.estado::text = 'retirado' then 'activo' else null end,
      e.estado::text,
      case when e.estado::text = 'retirado'
        then 'Retiro voluntario por cambio de domicilio familiar.'
        else 'Ingreso por transferencia de otro centro educativo.' end,
      current_date - 30
    from public.estudiantes e
    where e.estado::text in ('retirado', 'transferido');
  end if;

  if not exists (select 1 from public.convalidaciones limit 1) then
    insert into public.convalidaciones
      (estudiante_id, colegio_origen, anio_origen, grado, asignatura, nota)
    select e.id, 'Colegio Nuestra Señora de la Altagracia', '2024–2025',
      'Grado anterior', a.nombre,
      (72 + abs(hashtext(e.id::text || a.nombre)) % 24)::numeric
    from public.estudiantes e
    cross join (values ('Lengua Española'), ('Matemática'),
                       ('Ciencias Sociales'), ('Ciencias de la Naturaleza')) a(nombre)
    where e.estado::text = 'transferido';
  end if;
end $$;

commit;
