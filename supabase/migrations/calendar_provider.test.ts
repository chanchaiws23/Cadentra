import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./202608040001_initial_schema.sql', import.meta.url), 'utf8')
const environmentExample = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')

describe('calendar provider scope', () => {
  it('keeps the first release focused on Google Calendar only', () => {
    expect(migration).toContain("check (provider = 'google')")
    expect(environmentExample).toContain('GOOGLE_CALENDAR_CLIENT_ID=')
    expect(environmentExample).toContain('GOOGLE_CALENDAR_CLIENT_SECRET=')
    expect(`${migration}\n${environmentExample}`.toLowerCase()).not.toContain('microsoft')
    expect(`${migration}\n${environmentExample}`.toLowerCase()).not.toContain('outlook')
  })
})
