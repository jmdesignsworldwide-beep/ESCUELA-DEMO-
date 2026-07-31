-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  JM ESCOLAR · GAP 3 — Comunicación por WhatsApp                       ║
-- ║  Aplicar vía Management API (PAT temporal).                          ║
-- ║                                                                        ║
-- ║  Plantillas de mensajes + registro de envíos (enlaces wa.me           ║
-- ║  click-to-chat, sin API de Meta). Destinatarios = tutor principal con ║
-- ║  teléfono + saldo. RLS + FORCE; registro de envíos append-only.       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

begin;

-- ── Plantillas de mensaje ───────────────────────────────────────────────
create table if not exists public.plantillas_whatsapp (
  id         uuid primary key default gen_random_uuid(),
  sede_id    uuid not null references public.sedes(id) on delete cascade,
  nombre     text not null,
  categoria  text not null check (categoria in
               ('general', 'cobro', 'circular', 'asistencia', 'calificaciones')),
  cuerpo     text not null,
  activa     boolean not null default true,
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sede_id, nombre)
);

drop trigger if exists trg_plwa_updated on public.plantillas_whatsapp;
create trigger trg_plwa_updated
  before update on public.plantillas_whatsapp
  for each row execute function public.set_updated_at();

-- ── Registro de envíos (append-only) ────────────────────────────────────
create table if not exists public.envios_whatsapp (
  id            uuid primary key default gen_random_uuid(),
  sede_id       uuid not null references public.sedes(id) on delete cascade,
  estudiante_id uuid references public.estudiantes(id) on delete set null,
  telefono      text not null,
  categoria     text not null,
  mensaje       text not null,
  plantilla_id  uuid references public.plantillas_whatsapp(id) on delete set null,
  enviado_por   uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_envwa_fecha
  on public.envios_whatsapp(created_at desc);

drop trigger if exists trg_envwa_inmutable on public.envios_whatsapp;
create trigger trg_envwa_inmutable
  before update or delete on public.envios_whatsapp
  for each row execute function public.impedir_cambios();

-- ── RLS + FORCE ─────────────────────────────────────────────────────────
alter table public.plantillas_whatsapp enable row level security;
alter table public.plantillas_whatsapp force row level security;
alter table public.envios_whatsapp enable row level security;
alter table public.envios_whatsapp force row level security;

drop policy if exists plwa_select on public.plantillas_whatsapp;
create policy plwa_select on public.plantillas_whatsapp
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'contabilidad'));
drop policy if exists plwa_write on public.plantillas_whatsapp;
create policy plwa_write on public.plantillas_whatsapp
  for all to authenticated
  using (private.tiene_rol('director', 'coordinador'))
  with check (private.tiene_rol('director', 'coordinador'));

drop policy if exists envwa_select on public.envios_whatsapp;
create policy envwa_select on public.envios_whatsapp
  for select to authenticated
  using (private.tiene_rol('director', 'coordinador', 'secretaria', 'contabilidad'));
drop policy if exists envwa_insert on public.envios_whatsapp;
create policy envwa_insert on public.envios_whatsapp
  for insert to authenticated
  with check (private.tiene_rol('director', 'coordinador', 'secretaria', 'contabilidad'));

-- ── RPC: destinatarios (tutor principal + teléfono + saldo) ─────────────
create or replace function public.destinatarios_whatsapp(
  p_seccion uuid default null, p_solo_morosos boolean default false)
returns table (
  estudiante_id uuid, estudiante text, tutor text, telefono text, saldo numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.id,
    e.apellidos || ', ' || e.nombres,
    coalesce(t.nombres || ' ' || t.apellidos, '—'),
    t.telefono,
    coalesce((select sum(c.monto) from public.cargos c
      where c.estudiante_id = e.id and c.estado in ('pendiente', 'parcial')), 0)
  from public.estudiantes e
  join public.matriculas m on m.estudiante_id = e.id and m.estado = 'activa'
  left join public.estudiante_tutores et
    on et.estudiante_id = e.id and et.principal
  left join public.tutores t on t.id = et.tutor_id
  where e.estado = 'activo'
    and (p_seccion is null or m.seccion_id = p_seccion)
    and t.telefono is not null
    and (not p_solo_morosos or coalesce((select sum(c.monto) from public.cargos c
      where c.estudiante_id = e.id and c.estado in ('pendiente', 'parcial')), 0) > 0)
  order by e.apellidos, e.nombres;
$$;
revoke all on function public.destinatarios_whatsapp(uuid, boolean) from public, anon;
grant execute on function public.destinatarios_whatsapp(uuid, boolean) to authenticated, service_role;

-- ── SEMILLA — plantillas ────────────────────────────────────────────────
do $$
declare v_sede uuid;
begin
  select id into v_sede from public.sedes order by created_at limit 1;
  if v_sede is null then return; end if;
  if exists (select 1 from public.plantillas_whatsapp where sede_id = v_sede) then
    return;
  end if;
  insert into public.plantillas_whatsapp (sede_id, nombre, categoria, cuerpo, orden)
  values
    (v_sede, 'Recordatorio de pago', 'cobro',
     'Estimado/a {tutor}, le recordamos con respeto que la cuenta de {estudiante} presenta un saldo pendiente de {saldo} en {colegio}. Agradecemos ponerse al día. ¡Gracias por su confianza!', 1),
    (v_sede, 'Aviso general', 'general',
     'Estimada familia de {estudiante}, desde {colegio} le informamos: ', 2),
    (v_sede, 'Citación a reunión', 'general',
     'Estimado/a {tutor}, le invitamos a una reunión en {colegio} referente a {estudiante}. Por favor confirme su asistencia. Saludos cordiales.', 3),
    (v_sede, 'Recordatorio de asistencia', 'asistencia',
     'Estimado/a {tutor}, notamos ausencias recientes de {estudiante}. Le agradecemos comunicarse con {colegio} para dar seguimiento. Gracias.', 4),
    (v_sede, 'Felicitación', 'calificaciones',
     '¡Felicidades! {estudiante} ha tenido un desempeño destacado en {colegio}. Gracias por su apoyo en casa. 🎉', 5);
end $$;

commit;
