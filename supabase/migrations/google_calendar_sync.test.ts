import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('./202608140002_google_calendar_sync.sql', import.meta.url), 'utf8')

describe('Google Calendar sync storage', () => {
  it('keeps OAuth tokens inaccessible to authenticated clients', () => {
    expect(migration).toContain('calendar_oauth_tokens enable row level security')
    expect(migration).not.toMatch(/create policy[^;]+calendar_oauth_tokens/i)
  })

  it('makes imported events read-only for their owner', () => {
    expect(migration).toContain('owners can read imported calendar events')
    expect(migration).not.toMatch(/for (insert|update|delete) to authenticated/i)
  })
})
