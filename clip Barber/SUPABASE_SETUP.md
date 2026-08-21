# Activar el panel online

1. Creá un proyecto en [Supabase](https://supabase.com/dashboard) y, en **SQL Editor**, ejecutá todo el archivo `supabase.sql`.
2. En **Authentication > Users**, creá el usuario administrador con email y contraseña. Desactivá el registro público si no querés que nadie más pueda crear una cuenta.
3. En **Settings > API**, copiá el `Project URL` y la `Publishable key` en `supabase-config.js`.
4. Publicá los archivos de esta carpeta en tu hosting. Desde `admin.html`, iniciá sesión y guardá los cambios.

La clave `service_role` nunca debe ponerse en `supabase-config.js`: solo corresponde usar la Publishable key.
