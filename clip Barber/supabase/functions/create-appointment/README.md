# Despliegue seguro de reservas

1. Creá un widget de Cloudflare Turnstile para el dominio final de la web.
2. Guardá en Supabase Edge Functions > Secrets:
   - `TURNSTILE_SECRET_KEY`: la clave secreta de Turnstile.
   - `ALLOWED_ORIGIN`: el origen exacto, por ejemplo `https://clipbarber.uy` (sin barra final).
3. Agregá la Site Key pública de Turnstile en `supabase-config.js` como `window.CLIP_TURNSTILE_SITE_KEY`.
4. Desde la carpeta del proyecto, iniciá sesión con Supabase CLI y ejecutá:

```bash
supabase functions deploy create-appointment
```

La función valida Turnstile en servidor y usa la clave de servicio solo dentro de Supabase. Nunca agregues esas claves a la web.
