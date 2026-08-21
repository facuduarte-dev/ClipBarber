-- Ejecutá este archivo en Supabase > SQL Editor para activar la carga de fotos.
-- Requiere haber ejecutado supabase-security-migration.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Fotos públicas de CLIP" on storage.objects;
drop policy if exists "Administradores suben fotos de CLIP" on storage.objects;
drop policy if exists "Administradores actualizan fotos de CLIP" on storage.objects;
drop policy if exists "Administradores eliminan fotos de CLIP" on storage.objects;

create policy "Fotos públicas de CLIP"
on storage.objects for select to public
using (bucket_id = 'gallery');

create policy "Administradores suben fotos de CLIP"
on storage.objects for insert to authenticated
with check (bucket_id = 'gallery' and public.is_site_admin());

create policy "Administradores actualizan fotos de CLIP"
on storage.objects for update to authenticated
using (bucket_id = 'gallery' and public.is_site_admin())
with check (bucket_id = 'gallery' and public.is_site_admin());

create policy "Administradores eliminan fotos de CLIP"
on storage.objects for delete to authenticated
using (bucket_id = 'gallery' and public.is_site_admin());
