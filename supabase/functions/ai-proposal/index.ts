// Supabase Edge Function. AI providers may only return proposals; this function
// never writes tasks. The authenticated client must preview and explicitly apply
// accepted changes through a separate database transaction.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const authorization = request.headers.get('Authorization')
  if (!authorization) return new Response('Unauthorized', { status: 401 })
  const { tasks = [], constraints = [] } = await request.json()
  return Response.json({
    status: 'draft',
    reason: 'Provider integration is not configured. This safe deterministic proposal preserves the approval flow.',
    changes: tasks.slice(0, 2).map((task: { id: string }) => ({ taskId: task.id, action: 'move', accepted: false })),
    constraintsApplied: constraints,
  })
})

