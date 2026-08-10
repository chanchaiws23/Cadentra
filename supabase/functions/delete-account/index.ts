import { createClient } from 'npm:@supabase/supabase-js@2'

function corsHeaders(request: Request): Record<string, string> {
  const configured = Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173'
  const allowedOrigins = configured.split(',').map((origin) => origin.trim()).filter(Boolean)
  const origin = request.headers.get('Origin') ?? allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

async function collectUserFiles(client: ReturnType<typeof createClient>, bucket: string, path: string): Promise<string[]> {
  const files: string[] = []
  let offset = 0
  do {
    const { data, error } = await client.storage.from(bucket).list(path, { limit: 1_000, offset })
    if (error) throw error
    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name
      if (item.id) files.push(itemPath)
      else files.push(...await collectUserFiles(client, bucket, itemPath))
    }
    if (data.length < 1_000) break
    offset += data.length
  } while (true)
  return files
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  const requestOrigin = request.headers.get('Origin')
  if (requestOrigin && headers['Access-Control-Allow-Origin'] !== requestOrigin) return new Response('Forbidden origin', { status: 403, headers })
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  const authorization = request.headers.get('Authorization')
  if (!authorization) return new Response('Unauthorized', { status: 401, headers })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) return new Response('Server configuration error', { status: 500, headers })

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user }, error: userError } = await caller.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers })

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets()
    if (bucketError) throw bucketError
    for (const bucket of buckets) {
      const files = await collectUserFiles(admin, bucket.id, user.id)
      for (let index = 0; index < files.length; index += 100) {
        const { error } = await admin.storage.from(bucket.id).remove(files.slice(index, index + 100))
        if (error) throw error
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false)
    if (deleteError) throw deleteError
    return new Response(null, { status: 204, headers })
  } catch (error) {
    console.error('Account deletion failed', error instanceof Error ? error.message : 'unknown error')
    return new Response('Account deletion failed', { status: 500, headers })
  }
})
