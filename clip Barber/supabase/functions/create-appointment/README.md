# Despliegue seguro de reservas

1. Creá un widget de Cloudflare Turnstile para el dominio final de la web.
2. En Supabase > SQL Editor, ejecutá la versión actual de `supabase-bookings-migration.sql`. Activa los límites por teléfono y por origen.
3. Guardá en Supabase Edge Functions > Secrets:
   - `TURNSTILE_SECRET_KEY`: la clave secreta de Turnstile.
   - `ALLOWED_ORIGIN`: el origen exacto, por ejemplo `https://clipbarber.uy` (sin barra final).
4. Agregá la Site Key pública de Turnstile en `supabase-config.js` como `window.CLIP_TURNSTILE_SITE_KEY`.
5. Desde la carpeta del proyecto, iniciá sesión con Supabase CLI y ejecutá:

```bash
supabase functions deploy create-appointment
```

La función valida Turnstile en servidor, rechaza bots que completan el campo trampa y aplica un límite diario de cuatro solicitudes válidas por origen. La web no guarda IPs: Supabase recibe solo una huella hash irreversible. La clave de servicio y los secretos nunca deben agregarse a la web ni a GitHub.
