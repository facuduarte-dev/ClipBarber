-- Ejecutá este archivo en Supabase > SQL Editor para activar los turnos de domingo.
-- Requiere haber ejecutado antes supabase-security-migration.sql.

create table if not exists public.sunday_schedule (
  id text primary key check (id = 'sunday'),
  enabled boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '13:00',
  slot_minutes integer not null default 30 check (slot_minutes in (20, 30, 45, 60)),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

insert into public.sunday_schedule (id)
values ('sunday')
on conflict (id) do nothing;

create table if not exists public.appointments (
  id bigint generated always as identity primary key,
  booking_date date not null check (extract(isodow from booking_date) = 7),
  booking_time time not null,
  client_name text not null check (char_length(client_name) between 2 and 80),
  client_phone text not null check (client_phone ~ '^\d{8,15}$'),
  service text not null check (char_length(service) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (booking_date, booking_time)
);

create table if not exists public.site_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.sunday_schedule enable row level security;
alter table public.appointments enable row level security;
alter table public.site_staff enable row level security;
revoke all on table public.site_staff from anon, authenticated;

drop policy if exists "La web consulta horarios de domingo" on public.sunday_schedule;
drop policy if exists "Solo administradores modifican horarios" on public.sunday_schedule;
drop policy if exists "Solo administradores ven reservas" on public.appointments;
drop policy if exists "Personal autorizado ve reservas" on public.appointments;

create policy "La web consulta horarios de domingo"
on public.sunday_schedule for select to anon, authenticated
using (id = 'sunday');

create policy "Solo administradores modifican horarios"
on public.sunday_schedule for all to authenticated
using (id = 'sunday' and public.is_site_admin())
with check (id = 'sunday' and public.is_site_admin());

create or replace function public.can_view_appointments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_site_admin()
    or exists (select 1 from public.site_staff where user_id = auth.uid());
$$;

revoke all on function public.can_view_appointments() from public;
grant execute on function public.can_view_appointments() to authenticated;

create policy "Personal autorizado ve reservas"
on public.appointments for select to authenticated
using (public.can_view_appointments());

create or replace function public.available_sunday_slots(p_booking_date date)
returns table (booking_time time)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  schedule public.sunday_schedule%rowtype;
  local_today date := (now() at time zone 'America/Montevideo')::date;
begin
  if p_booking_date is null
    or p_booking_date < local_today
    or p_booking_date > local_today + 90
    or extract(isodow from p_booking_date) <> 7 then
    return;
  end if;

  select * into schedule from public.sunday_schedule where id = 'sunday';
  if not found or not schedule.enabled then return; end if;

  return query
  select slot::time
  from generate_series(
    p_booking_date + schedule.start_time,
    p_booking_date + schedule.end_time - make_interval(mins => schedule.slot_minutes),
    make_interval(mins => schedule.slot_minutes)
  ) as slot
  where not exists (
    select 1 from public.appointments a
    where a.booking_date = p_booking_date and a.booking_time = slot::time
  )
  order by slot;
end;
$$;

create or replace function public.create_appointment(
  p_booking_date date,
  p_booking_time time,
  p_client_name text,
  p_client_phone text,
  p_service text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule public.sunday_schedule%rowtype;
  local_today date := (now() at time zone 'America/Montevideo')::date;
begin
  if p_booking_date is null
    or p_booking_date < local_today
    or p_booking_date > local_today + 90
    or extract(isodow from p_booking_date) <> 7 then
    raise exception 'Fecha no disponible';
  end if;
  if char_length(trim(p_client_name)) not between 2 and 80
    or trim(p_client_phone) !~ '^\d{8,15}$'
    or char_length(trim(p_service)) not between 2 and 60 then
    raise exception 'Datos de reserva inválidos';
  end if;

  -- Serializa reservas del mismo número para que no pueda saltear límites
  -- enviando varias solicitudes al mismo tiempo.
  perform pg_advisory_xact_lock(hashtext(trim(p_client_phone)));
  if exists (
    select 1 from public.appointments
    where client_phone = trim(p_client_phone) and booking_date = p_booking_date
  ) then
    raise exception 'Ya tenés un turno reservado para este domingo';
  end if;
  if (
    select count(*) from public.appointments
    where client_phone = trim(p_client_phone) and booking_date >= local_today
  ) >= 2 then
    raise exception 'Este número ya alcanzó el máximo de dos turnos futuros';
  end if;

  select * into schedule from public.sunday_schedule where id = 'sunday';
  if not found or not schedule.enabled then raise exception 'Turnos no disponibles'; end if;
  if p_booking_time < schedule.start_time or p_booking_time >= schedule.end_time
    or mod(extract(epoch from (p_booking_time - schedule.start_time))::integer / 60, schedule.slot_minutes) <> 0 then
    raise exception 'Horario no disponible';
  end if;

  insert into public.appointments (booking_date, booking_time, client_name, client_phone, service)
  values (p_booking_date, p_booking_time, trim(p_client_name), trim(p_client_phone), trim(p_service));
  return jsonb_build_object('ok', true);
exception when unique_violation then
  raise exception 'Horario no disponible';
end;
$$;

revoke all on function public.available_sunday_slots(date) from public;
revoke all on function public.create_appointment(date, time, text, text, text) from public;
grant execute on function public.available_sunday_slots(date) to anon, authenticated;
grant execute on function public.create_appointment(date, time, text, text, text) to service_role;

-- Para dar acceso a un barbero, creá primero su usuario en Authentication > Users
-- y luego reemplazá el email y ejecutá estas tres líneas:
-- insert into public.site_staff (user_id)
-- select id from auth.users where email = 'email-del-barbero@ejemplo.com'
-- on conflict (user_id) do nothing;
