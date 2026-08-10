import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608100003_goals_milestones.sql', import.meta.url), 'utf8')

describe('goals and milestones migration', () => {
  it('adds retry-safe goals and an RLS protected milestone table', () => {
    expect(migration).toContain('goals_user_idempotency_idx')
    expect(migration).toContain('create table if not exists public.milestones')
    expect(migration).toContain('alter table public.milestones enable row level security')
    expect(migration).toContain('(select auth.uid()) = user_id')
    expect(migration).toContain('goals.user_id = (select auth.uid())')
    expect(migration).toContain('milestones_user_idempotency_idx')
  })
})
