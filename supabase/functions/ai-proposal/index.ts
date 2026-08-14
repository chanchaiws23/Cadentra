import { createClient } from 'npm:@supabase/supabase-js@2'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' }
const schema = {
  type: 'object', additionalProperties: false, required: ['reason', 'changes'], properties: {
    reason: { type: 'string' },
    changes: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['taskId', 'action', 'start', 'end'], properties: { taskId: { type: 'string' }, action: { type: 'string', enum: ['move', 'resize'] }, start: { type: 'string' }, end: { type: 'string' } } } },
  },
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  const authorization = request.headers.get('Authorization')
  const url = Deno.env.get('SUPABASE_URL'); const anon = Deno.env.get('SUPABASE_ANON_KEY'); const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!authorization || !url || !anon) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  if (!apiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }), { status: 503, headers })
  const client = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const input = await request.json() as { instruction?: string; includeHealth?: boolean }
  const [{ data: tasks, error: taskError }, { data: profile }] = await Promise.all([
    client.from('tasks').select('id,title,starts_at,ends_at,priority,status').eq('user_id', user.id).is('deleted_at', null).neq('status', 'done').order('starts_at').limit(30),
    client.from('profiles').select('timezone,health_ai_consent').eq('id', user.id).single(),
  ])
  if (taskError) return new Response(JSON.stringify({ error: taskError.message }), { status: 500, headers })
  let health: unknown[] = []
  if (input.includeHealth && profile?.health_ai_consent) {
    const { data } = await client.from('daily_health_aggregates').select('local_date,steps,sleep_minutes,exercise_minutes').eq('user_id', user.id).order('local_date', { ascending: false }).limit(7)
    health = data ?? []
  }
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
    model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini', store: false,
    input: [{ role: 'system', content: 'You are a supportive scheduling coach. Propose realistic schedule changes only. Never give medical advice. Preserve task duration unless resize is needed. Return UTC ISO timestamps.' }, { role: 'user', content: JSON.stringify({ instruction: input.instruction ?? 'Reschedule unfinished work into a realistic plan.', timezone: profile?.timezone ?? 'UTC', tasks, health: input.includeHealth && profile?.health_ai_consent ? health : undefined }) }],
    text: { format: { type: 'json_schema', name: 'cadentra_schedule_proposal', strict: true, schema } },
  }) })
  if (!response.ok) return new Response(JSON.stringify({ error: `OpenAI request failed (${response.status})` }), { status: 502, headers })
  const result = await response.json() as { output?: Array<{ content?: Array<{ type: string; text?: string }> }> }
  const text = result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text
  if (!text) return new Response(JSON.stringify({ error: 'AI returned no structured proposal' }), { status: 502, headers })
  const generated = JSON.parse(text) as { reason: string; changes: Array<{ taskId: string; action: 'move' | 'resize'; start: string; end: string }> }
  const taskMap = new Map((tasks ?? []).map((task) => [task.id, task]))
  const changes = generated.changes.flatMap((change) => {
    const task = taskMap.get(change.taskId); const start = new Date(change.start); const end = new Date(change.end)
    if (!task || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return []
    return [{ id: crypto.randomUUID(), taskId: task.id, action: change.action, before: { start: task.starts_at, end: task.ends_at }, after: { start: start.toISOString(), end: end.toISOString() }, accepted: false }]
  })
  const { data: proposal, error } = await client.from('ai_proposals').insert({ user_id: user.id, status: 'draft', reason: generated.reason, changes, input_snapshot: { instruction: input.instruction ?? '', taskIds: [...taskMap.keys()], healthIncluded: Boolean(input.includeHealth && profile?.health_ai_consent) } }).select('id,status,reason,changes,created_at').single()
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  return new Response(JSON.stringify(proposal), { headers })
})
