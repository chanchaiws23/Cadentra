import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608120003_focus_session_details.sql', import.meta.url), 'utf8')

describe('focus session details migration', () => {
  it('stores non-negative pause time and an interruption array', () => {
    expect(migration).toContain('pause_seconds >= 0')
    expect(migration).toContain("jsonb_typeof(interruptions) = 'array'")
  })
})
