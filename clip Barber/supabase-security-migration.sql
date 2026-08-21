-- Ejecutá este archivo si ya habías ejecutado una versión anterior de supabase.sql.
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;
revoke all on table public.site_admins from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.site_admins where user_id = auth.uid());
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

drop policy if exists "Usuarios autenticados administran la configuración" on public.site_config;
drop policy if exists "Solo administradores modifican la configuración" on public.site_config;

create policy "Solo administradores modifican la configuración"
on public.site_config for all to authenticated
using (id = 'clip' and public.is_site_admin())
with check (id = 'clip' and public.is_site_admin());

-- Reemplazá el email y ejecutá estas tres líneas una vez.
-- insert into public.site_admins (user_id)
-- select id from auth.users where email = 'tu-email@ejemplo.com'
-- on conflict (user_id) do nothing;
