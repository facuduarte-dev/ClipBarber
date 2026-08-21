import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')
const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
const serviceKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || serviceKeys.default
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const whatsappNotifyTo = Deno.env.get('WHATSAPP_NOTIFY_TO') || '59898743328'
const whatsappTemplateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME')
const whatsappTemplateLanguage = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'es'
const whatsappApiVersion = Deno.env.get('WHATSAPP_API_VERSION') || 'v26.0'
const resendApiKey = Deno.env.get('RESEND_API_KEY')
const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')
const bookingNotificationEmail = Deno.env.get('BOOKING_NOTIFICATION_EMAIL')

const json = (body: Record<string, unknown>, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
  },
})

const requestFingerprint = async (ip: string) => {
  const source = new TextEncoder().encode(`${turnstileSecret}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', source)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const bookingMessage = (booking: { date: string; time: string; name: string; phone: string; service: string }) => [
  'Nueva reserva en CLIP Barber Studio',
  '',
  `Fecha: ${booking.date}`,
  `Hora: ${booking.time}`,
  `Cliente: ${booking.name}`,
  `WhatsApp: ${booking.phone}`,
  `Servicio: ${booking.service}`,
].join('\n')

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))

const bookingEmailHtml = (booking: { date: string; time: string; name: string; phone: string; service: string }) => {
  const field = (label: string, value: string) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eee8df;color:#766f67;font-size:13px;letter-spacing:.04em;text-transform:uppercase">${label}</td><td style="padding:12px 0 12px 16px;border-bottom:1px solid #eee8df;color:#1f1c19;font-size:15px;font-weight:700;text-align:right">${escapeHtml(value)}</td></tr>`
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px 12px;background:#f3f0eb;font-family:Arial,Helvetica,sans-serif;color:#1f1c19">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(34,28,22,.10)">
      <tr><td style="background:#191715;padding:28px 32px;color:#fff">
        <div style="font-size:12px;letter-spacing:.18em;font-weight:700;color:#c7a36b">CLIP BARBER STUDIO</div>
        <div style="font-size:25px;font-weight:800;margin-top:10px">Nueva reserva ✂</div>
        <div style="font-size:14px;color:#d8d1c9;margin-top:8px">Tenés un nuevo turno para revisar.</div>
      </td></tr>
      <tr><td style="padding:26px 32px 12px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${field('Fecha', booking.date)}
          ${field('Hora', booking.time)}
          ${field('Cliente', booking.name)}
          ${field('WhatsApp', booking.phone)}
          ${field('Servicio', booking.service)}
        </table>
      </td></tr>
      <tr><td align="center" style="padding:24px 32px 30px">
        <a href="https://clip-barber.vercel.app/admin.html" style="display:inline-block;background:#c7a36b;color:#191715;text-decoration:none;font-weight:800;font-size:14px;padding:14px 22px;border-radius:999px">Ver reservas en el panel</a>
        <p style="font-size:12px;line-height:1.5;color:#8b837b;margin:20px 0 0">Este aviso se generó automáticamente cuando se confirmó una reserva.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

const sendBookingNotification = async (booking: { date: string; time: string; name: string; phone: string; service: string }) => {
  // La notificación es opcional: si WhatsApp Business no está configurado,
  // la reserva continúa funcionando con normalidad.
  if (!whatsappAccessToken || !whatsappPhoneNumberId || !whatsappNotifyTo) return
  const message = `✂️ ${bookingMessage(booking)}`
  const payload = whatsappTemplateName
    ? {
        messaging_product: 'whatsapp', to: whatsappNotifyTo, type: 'template',
        template: {
          name: whatsappTemplateName,
          language: { code: whatsappTemplateLanguage },
          components: [{ type: 'body', parameters: [booking.date, booking.time, booking.name, booking.phone, booking.service].map((text) => ({ type: 'text', text })) }],
        },
      }
    : { messaging_product: 'whatsapp', to: whatsappNotifyTo, type: 'text', text: { preview_url: false, body: message } }
  const response = await fetch(`https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${whatsappAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) console.error('No se pudo enviar la notificación de WhatsApp.')
}

const sendBookingEmail = async (booking: { date: string; time: string; name: string; phone: string; service: string }) => {
  // El correo es opcional y se configura solamente con secretos de Supabase.
  if (!resendApiKey || !resendFromEmail || !bookingNotificationEmail) return
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json', 'User-Agent': 'clip-barber-bookings/1.0' },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [bookingNotificationEmail],
      subject: `Nueva reserva: ${booking.date} ${booking.time}`,
      text: bookingMessage(booking),
      html: bookingEmailHtml(booking),
    }),
  })
  if (!response.ok) console.error('No se pudo enviar la notificación por correo.')
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || ''
  if (!allowedOrigin || origin !== allowedOrigin) return json({ error: 'Origen no autorizado' }, 403)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST', 'Vary': 'Origin' } })
  }
  if (request.method !== 'POST' || !turnstileSecret || !serviceRoleKey || !supabaseUrl) return json({ error: 'Servicio no configurado' }, 503, origin)

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: 'Solicitud inválida' }, 400, origin)
  if (String(body.website || '').trim()) return json({ error: 'Solicitud inválida' }, 400, origin)
  const token = String(body.turnstileToken || '')
  if (!token) return json({ error: 'Completá la verificación de seguridad' }, 400, origin)

  const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '' }),
  }).then((response) => response.json()).catch(() => null)
  if (!verification?.success) return json({ error: 'La verificación de seguridad venció. Intentá de nuevo.' }, 400, origin)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip')?.trim() || 'unknown'
  const fingerprint = await requestFingerprint(ip)
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const booking = {
    date: String(body.bookingDate || ''),
    time: String(body.bookingTime || ''),
    name: String(body.clientName || '').trim(),
    phone: String(body.clientPhone || '').replace(/\D/g, ''),
    service: String(body.service || '').trim(),
  }
  const { error } = await supabase.rpc('create_appointment', {
    p_booking_date: booking.date,
    p_booking_time: booking.time,
    p_client_name: booking.name,
    p_client_phone: booking.phone,
    p_service: booking.service,
    p_request_fingerprint: fingerprint,
  })
  if (error) return json({ error: error.message }, 400, origin)
  await sendBookingNotification(booking).catch(() => console.error('No se pudo enviar la notificación de WhatsApp.'))
  await sendBookingEmail(booking).catch(() => console.error('No se pudo enviar la notificación por correo.'))
  return json({ ok: true }, 201, origin)
})
