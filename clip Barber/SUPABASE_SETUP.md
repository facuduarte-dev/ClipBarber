# Activar el panel online

1. Creá un proyecto en [Supabase](https://supabase.com/dashboard) y, en **SQL Editor**, ejecutá todo el archivo `supabase.sql`.
2. En **Authentication > Users**, creá el usuario administrador con email y contraseña. Desactivá el registro público.
3. Al final de `supabase.sql`, reemplazá `tu-email@ejemplo.com` por ese email, quitá los dos guiones (`--`) de las tres líneas `insert` y ejecutalas. Esto autoriza únicamente a ese usuario a editar la web.
4. En **Settings > API**, copiá el `Project URL` y la `Publishable key` en `supabase-config.js`.
5. Publicá los archivos de esta carpeta en tu hosting. Desde `admin.html`, iniciá sesión y guardá los cambios.

Si ya habías ejecutado la versión anterior, corré `supabase-security-migration.sql` en SQL Editor y después autorizá tu email al final de ese mismo archivo.

Para activar las reservas de domingo, ejecutá después `supabase-bookings-migration.sql` en SQL Editor.

Para que el administrador pueda subir fotos de trabajos, ejecutá también `supabase-gallery-migration.sql` en SQL Editor.

La clave `service_role` nunca debe ponerse en `supabase-config.js`: solo corresponde usar la Publishable key.
