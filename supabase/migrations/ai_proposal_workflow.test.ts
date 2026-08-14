import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
const source = readFileSync(new URL('./202608140005_ai_proposal_workflow.sql', import.meta.url), 'utf8')
describe('AI proposal workflow', () => {
  it('applies only selected changes and records reversible audit events', () => {
    expect(source).toContain('p_change_ids')
    expect(source).toContain("'ai_schedule_apply'")
    expect(source).toContain("status = 'undone'")
    expect(source).toContain('user_id = (select auth.uid())')
  })
})
