import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608120002_habit_streak_freezes.sql', import.meta.url), 'utf8')

describe('habit streak freeze migration', () => {
  it('uses an authenticated atomic function and prevents negative balances', () => {
    expect(migration).toContain('security definer')
    expect(migration).toContain('user_id = (select auth.uid())')
    expect(migration).toContain('freeze_balance > 0')
    expect(migration).toContain('if found and existing_freeze then')
    expect(migration).toContain('p_local_date > current_date')
    expect(migration).toContain('grant execute on function public.use_habit_freeze')
  })
})
