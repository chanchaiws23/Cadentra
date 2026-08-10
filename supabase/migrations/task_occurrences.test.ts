import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608100004_task_occurrences.sql', import.meta.url), 'utf8')

describe('task occurrence migration', () => {
  it('stores per-day status with user isolation and no future task copies', () => {
    expect(migration).toContain('unique(task_id, local_date)')
    expect(migration).toContain('alter table public.task_occurrences enable row level security')
    expect(migration).toContain('tasks.user_id = (select auth.uid())')
  })
})
