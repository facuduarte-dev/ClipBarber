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

## Aviso automático por WhatsApp (opcional)

Para recibir un mensaje por cada reserva confirmada, configurá una app oficial de **WhatsApp Business Cloud API** y guardá estos secretos en Supabase Edge Functions:

- `WHATSAPP_ACCESS_TOKEN`: token permanente de Meta.
- `WHATSAPP_PHONE_NUMBER_ID`: identificador del número emisor en WhatsApp Business.
- `WHATSAPP_NOTIFY_TO`: opcional; número que recibe los avisos, en formato internacional sin `+`. Por defecto usa el WhatsApp actual del negocio (`59898743328`).
- `WHATSAPP_API_VERSION`: opcional; por defecto usa `v22.0`.

La reserva nunca falla si WhatsApp no está configurado o si el proveedor no responde. Los tokens solo viven en los secretos de Supabase, nunca en la web ni en GitHub.
