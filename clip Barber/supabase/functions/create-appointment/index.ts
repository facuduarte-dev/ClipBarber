import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')
const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
const serviceKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || serviceKeys.default
const supabaseUrl = Deno.env.get('SUPABASE_URL')

const json = (body: Record<string, unknown>, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
  },
})

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || ''
  if (!allowedOrigin || origin !== allowedOrigin) return json({ error: 'Origen no autorizado' }, 403)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST', 'Vary': 'Origin' } })
  }
  if (request.method !== 'POST' || !turnstileSecret || !serviceRoleKey || !supabaseUrl) return json({ error: 'Servicio no configurado' }, 503, origin)

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: 'Solicitud inválida' }, 400, origin)
  const token = String(body.turnstileToken || '')
  if (!token) return json({ error: 'Completá la verificación de seguridad' }, 400, origin)

  const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '' }),
  }).then((response) => response.json()).catch(() => null)
  if (!verification?.success) return json({ error: 'La verificación de seguridad venció. Intentá de nuevo.' }, 400, origin)

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await supabase.rpc('create_appointment', {
    p_booking_date: String(body.bookingDate || ''),
    p_booking_time: String(body.bookingTime || ''),
    p_client_name: String(body.clientName || ''),
    p_client_phone: String(body.clientPhone || '').replace(/\D/g, ''),
    p_service: String(body.service || ''),
  })
  if (error) return json({ error: error.message }, 400, origin)
  return json({ ok: true }, 201, origin)
})
