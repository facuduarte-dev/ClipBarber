# Entrega — CLIP Barber Studio

## Enlaces

- Web pública: https://clip-barber.vercel.app
- Panel administrador: `https://clip-barber.vercel.app/admin.html`
- Panel de barbero: `https://clip-barber.vercel.app/barbero.html`

## Antes de entregar

1. Confirmar dirección, horarios y precios reales.
2. Subir fotos reales desde el panel administrador.
3. Crear o confirmar el usuario del barbero en Supabase y asignarlo a `site_staff`.
4. Hacer una reserva real y confirmar que aparece en el panel del barbero.
5. Entregar al dueño acceso a sus cuentas de Supabase, GitHub y Vercel. Nunca compartir contraseñas ni claves por chat.

## Reservas y seguridad

- Las reservas solo están habilitadas para sábados y domingos que el administrador active.
- Turnstile, límites por teléfono y por origen protegen la agenda de bots y spam.
- Un barbero autorizado puede cancelar una reserva desde su panel; el horario vuelve a quedar disponible.

## Avisos por WhatsApp

La función para avisos está publicada, pero necesita una cuenta de WhatsApp Business/Meta verificada y los secretos `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` en Supabase. También puede mandar un correo si se configuran los secretos de Resend. Mientras tanto, las reservas siguen funcionando con normalidad.
