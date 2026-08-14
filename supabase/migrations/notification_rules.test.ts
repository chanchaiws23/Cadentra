import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(new URL('./202608140001_notification_rules.sql', import.meta.url), 'utf8')
describe('notification rules migration', () => {
  it('isolates rules and constrains notification volume', () => {
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('(select auth.uid()) = user_id')
    expect(sql).toContain('daily_limit between 1 and 20')
  })
})
