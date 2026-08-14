import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const source = readFileSync(new URL('../../../supabase/functions/ai-proposal/index.ts', import.meta.url), 'utf8')
describe('AI proposal Edge Function', () => {
  it('uses structured Responses output without granting task writes', () => {
    expect(source).toContain("'https://api.openai.com/v1/responses'")
    expect(source).toContain("type: 'json_schema'")
    expect(source).toContain('store: false')
    expect(source).toContain("from('ai_proposals').insert")
    expect(source).not.toContain("from('tasks').update")
  })
  it('requires separate consent before loading health aggregates', () => {
    expect(source).toContain('input.includeHealth && profile?.health_ai_consent')
  })
})
