import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')
const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
const serviceKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || serviceKeys.default
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const whatsappNotifyTo = Deno.env.get('WHATSAPP_NOTIFY_TO') || '59898743328'
const whatsappApiVersion = Deno.env.get('WHATSAPP_API_VERSION') || 'v22.0'

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

const sendBookingNotification = async (booking: { date: string; time: string; name: string; phone: string; service: string }) => {
  // La notificación es opcional: si WhatsApp Business no está configurado,
  // la reserva continúa funcionando con normalidad.
  if (!whatsappAccessToken || !whatsappPhoneNumberId || !whatsappNotifyTo) return
  const message = [
    '✂️ Nueva reserva en CLIP Barber Studio',
    '',
    `Fecha: ${booking.date}`,
    `Hora: ${booking.time}`,
    `Cliente: ${booking.name}`,
    `WhatsApp: ${booking.phone}`,
    `Servicio: ${booking.service}`,
  ].join('\n')
  const response = await fetch(`https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${whatsappAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: whatsappNotifyTo, type: 'text', text: { preview_url: false, body: message } }),
  })
  if (!response.ok) console.error('No se pudo enviar la notificación de WhatsApp.')
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
  return json({ ok: true }, 201, origin)
})
