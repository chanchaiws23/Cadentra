import { createClient } from 'npm:@supabase/supabase-js@2'

type TokenSet = { access_token: string; refresh_token?: string; expires_at: number }

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const jsonHeaders = { 'Content-Type': 'application/json' }

function cors(request: Request) {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map((value) => value.trim())
  const origin = request.headers.get('Origin') ?? allowed[0]
  return { ...jsonHeaders, 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0], 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' }
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

async function cryptoKey() {
  const raw = Deno.env.get('GOOGLE_CALENDAR_TOKEN_KEY')
  if (!raw) throw new Error('GOOGLE_CALENDAR_TOKEN_KEY is not configured')
  const bytes = base64ToBytes(raw)
  if (bytes.length !== 32) throw new Error('GOOGLE_CALENDAR_TOKEN_KEY must be a base64 encoded 32-byte key')
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(tokens: TokenSet) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), encoder.encode(JSON.stringify(tokens)))
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) }
}

async function decrypt(ciphertext: string, iv: string): Promise<TokenSet> {
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv) }, await cryptoKey(), base64ToBytes(ciphertext))
  return JSON.parse(decoder.decode(clear)) as TokenSet
}

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`)
  return await response.json() as { access_token: string; refresh_token?: string; expires_in: number }
}

Deno.serve(async (request) => {
  const headers = cors(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
  if (!supabaseUrl || !anonKey || !serviceKey || !clientId || !clientSecret) return new Response(JSON.stringify({ error: 'Server configuration is incomplete' }), { status: 500, headers })
  const redirectUri = `${supabaseUrl}/functions/v1/google-calendar`
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (!code || !state) throw new Error('OAuth callback is missing code or state')
      const { data: stateRow } = await admin.from('calendar_oauth_states').delete().eq('state', state).gt('expires_at', new Date().toISOString()).select('user_id').maybeSingle()
      if (!stateRow) throw new Error('OAuth state is invalid or expired')
      const token = await exchangeToken(new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }))
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })
      if (!profileResponse.ok) throw new Error('Unable to read Google account profile')
      const profile = await profileResponse.json() as { email: string }
      const encrypted = await encrypt({ access_token: token.access_token, refresh_token: token.refresh_token, expires_at: Date.now() + token.expires_in * 1000 })
      const { data: tokenRow, error: tokenError } = await admin.from('calendar_oauth_tokens').insert({ user_id: stateRow.user_id, ...encrypted }).select('id').single()
      if (tokenError) throw tokenError
      const { error: connectionError } = await admin.from('calendar_connections').upsert({ user_id: stateRow.user_id, provider: 'google', provider_account_id: profile.email, encrypted_token_ref: tokenRow.id, sync_status: 'idle' }, { onConflict: 'user_id,provider,provider_account_id' })
      if (connectionError) throw connectionError
      return Response.redirect(`${appUrl}/settings?calendar=connected`, 302)
    }

    const authorization = request.headers.get('Authorization')
    if (!authorization) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
    const { action } = await request.json() as { action: 'start' | 'sync' | 'disconnect' }

    if (action === 'start') {
      const state = bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
      const { error } = await admin.from('calendar_oauth_states').insert({ state, user_id: user.id, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() })
      if (error) throw error
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email https://www.googleapis.com/auth/calendar.readonly', access_type: 'offline', prompt: 'consent', state }).toString()
      return new Response(JSON.stringify({ url: authUrl.toString() }), { headers })
    }

    const { data: connection } = await admin.from('calendar_connections').select('id,encrypted_token_ref,sync_cursor').eq('user_id', user.id).eq('provider', 'google').maybeSingle()
    if (!connection) return new Response(JSON.stringify({ error: 'Google Calendar is not connected' }), { status: 409, headers })
    if (action === 'disconnect') {
      await admin.from('calendar_connections').delete().eq('id', connection.id)
      await admin.from('calendar_oauth_tokens').delete().eq('id', connection.encrypted_token_ref).eq('user_id', user.id)
      return new Response(JSON.stringify({ ok: true }), { headers })
    }

    await admin.from('calendar_connections').update({ sync_status: 'syncing' }).eq('id', connection.id)
    const { data: tokenRow } = await admin.from('calendar_oauth_tokens').select('ciphertext,iv').eq('id', connection.encrypted_token_ref).eq('user_id', user.id).single()
    if (!tokenRow) throw new Error('Calendar token reference is missing')
    let tokens = await decrypt(tokenRow.ciphertext, tokenRow.iv)
    if (tokens.expires_at < Date.now() + 60_000) {
      if (!tokens.refresh_token) throw new Error('Google refresh token is missing')
      const refreshed = await exchangeToken(new URLSearchParams({ refresh_token: tokens.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }))
      tokens = { access_token: refreshed.access_token, refresh_token: tokens.refresh_token, expires_at: Date.now() + refreshed.expires_in * 1000 }
      const nextEncrypted = await encrypt(tokens)
      await admin.from('calendar_oauth_tokens').update({ ...nextEncrypted, updated_at: new Date().toISOString() }).eq('id', connection.encrypted_token_ref)
    }
    const eventsUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    eventsUrl.searchParams.set('singleEvents', 'true')
    eventsUrl.searchParams.set('maxResults', '2500')
    eventsUrl.searchParams.set('showDeleted', 'true')
    if (connection.sync_cursor) eventsUrl.searchParams.set('syncToken', connection.sync_cursor)
    else eventsUrl.searchParams.set('timeMin', new Date(Date.now() - 30 * 86400_000).toISOString())
    const eventsResponse = await fetch(eventsUrl, { headers: { Authorization: `Bearer ${tokens.access_token}` } })
    if (eventsResponse.status === 410) {
      await admin.from('calendar_connections').update({ sync_cursor: null, sync_status: 'idle' }).eq('id', connection.id)
      return new Response(JSON.stringify({ retry: true }), { status: 409, headers })
    }
    if (!eventsResponse.ok) throw new Error(`Google events sync failed (${eventsResponse.status})`)
    const payload = await eventsResponse.json() as { items?: Array<Record<string, any>>; nextSyncToken?: string }
    for (const event of payload.items ?? []) {
      if (event.status === 'cancelled') {
        await admin.from('external_calendar_events').update({ deleted_at: new Date().toISOString() }).eq('connection_id', connection.id).eq('external_event_id', event.id)
        continue
      }
      const allDay = Boolean(event.start?.date)
      const start = event.start?.dateTime ?? `${event.start?.date}T00:00:00Z`
      const end = event.end?.dateTime ?? `${event.end?.date}T00:00:00Z`
      await admin.from('external_calendar_events').upsert({ user_id: user.id, connection_id: connection.id, external_event_id: event.id, title: event.summary ?? 'Busy', starts_at: start, ends_at: end, all_day: allDay, external_version: event.etag, deleted_at: null, updated_at: new Date().toISOString() }, { onConflict: 'connection_id,external_event_id' })
    }
    await admin.from('calendar_connections').update({ sync_cursor: payload.nextSyncToken ?? connection.sync_cursor, sync_status: 'idle', last_synced_at: new Date().toISOString() }).eq('id', connection.id)
    return new Response(JSON.stringify({ ok: true, imported: payload.items?.length ?? 0 }), { headers })
  } catch (error) {
    console.error('Google Calendar operation failed', error instanceof Error ? error.message : 'unknown')
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Calendar operation failed' }), { status: 500, headers })
  }
})
