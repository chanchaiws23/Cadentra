import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { JWT } from 'npm:google-auth-library@9.15.1'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' }

function localMinutes(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value)
}

function quietNow(timeZone: string, start: string, end: string) {
  const toMinutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute }
  const now = localMinutes(timeZone); const from = toMinutes(start); const until = toMinutes(end)
  return from <= until ? now >= from && now < until : now >= from || now < until
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !anon || !service || !authorization) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const payload = await request.json() as { kind: string; title: string; body: string; url?: string }
  const [{ data: rule }, { data: profile }, { data: devices }] = await Promise.all([
    admin.from('notification_rules').select('enabled,quiet_start,quiet_end,daily_limit').eq('user_id', user.id).maybeSingle(),
    admin.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
    admin.from('device_registrations').select('id,platform,registration').eq('user_id', user.id).eq('active', true),
  ])
  if (!rule?.enabled) return new Response(JSON.stringify({ error: 'Notifications are disabled' }), { status: 409, headers })
  if (quietNow(profile?.timezone ?? 'UTC', rule.quiet_start, rule.quiet_end)) return new Response(JSON.stringify({ error: 'Quiet hours are active' }), { status: 409, headers })
  const since = new Date(); since.setUTCHours(0, 0, 0, 0)
  const { count } = await admin.from('notification_deliveries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('sent_at', since.toISOString())
  if ((count ?? 0) >= rule.daily_limit) return new Response(JSON.stringify({ error: 'Daily notification limit reached' }), { status: 429, headers })

  let delivered = 0
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY'); const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY'); const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
  for (const device of devices ?? []) {
    try {
      if (device.platform === 'web' && vapidPublic && vapidPrivate && vapidSubject) {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
        await webpush.sendNotification(device.registration, JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/today', tag: `cadentra-${payload.kind}` }))
        delivered += 1
      } else if (device.platform === 'android' && firebaseJson) {
        const account = JSON.parse(firebaseJson) as { client_email: string; private_key: string; project_id: string }
        const jwt = new JWT({ email: account.client_email, key: account.private_key, scopes: ['https://www.googleapis.com/auth/firebase.messaging'] })
        const token = await jwt.getAccessToken()
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { token: device.registration.token, notification: { title: payload.title, body: payload.body }, data: { url: payload.url ?? '/today', kind: payload.kind } } }) })
        if (!response.ok) throw new Error(`FCM ${response.status}`)
        delivered += 1
      }
    } catch (error) {
      console.error('Push delivery failed', device.id, error instanceof Error ? error.message : 'unknown')
    }
  }
  if (!delivered) return new Response(JSON.stringify({ error: 'No configured device accepted the notification' }), { status: 503, headers })
  await admin.from('notification_deliveries').insert({ user_id: user.id, kind: payload.kind })
  return new Response(JSON.stringify({ delivered }), { headers })
})
