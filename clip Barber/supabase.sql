-- Ejecutar una sola vez en Supabase: SQL Editor.
create table if not exists public.site_config (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_config enable row level security;

create policy "La web puede leer su configuración"
on public.site_config for select to anon, authenticated
using (id = 'clip');

create policy "Usuarios autenticados administran la configuración"
on public.site_config for all to authenticated
using (id = 'clip') with check (id = 'clip');
