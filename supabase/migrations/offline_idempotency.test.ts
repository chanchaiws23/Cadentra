import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608100002_offline_idempotency.sql', import.meta.url), 'utf8')

describe('offline mutation idempotency migration', () => {
  it.each(['habits', 'point_transactions', 'focus_sessions'])('adds a user-scoped unique retry key for %s', (table) => {
    expect(migration).toContain(`alter table public.${table} add column if not exists idempotency_key text`)
    expect(migration).toContain(`on public.${table}(user_id, idempotency_key) where idempotency_key is not null`)
  })
})
