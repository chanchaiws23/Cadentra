import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../../../supabase/functions/google-calendar/index.ts', import.meta.url), 'utf8')

describe('Google Calendar Edge Function', () => {
  it('keeps OAuth exchange, token encryption, and refresh server-side', () => {
    expect(source).toContain('GOOGLE_CALENDAR_CLIENT_SECRET')
    expect(source).toContain("'AES-GCM'")
    expect(source).toContain("grant_type: 'refresh_token'")
    expect(source).not.toContain('VITE_GOOGLE')
  })

  it('uses one-time OAuth state and incremental event cursors', () => {
    expect(source).toContain("from('calendar_oauth_states').delete()")
    expect(source).toContain("eventsUrl.searchParams.set('syncToken'")
    expect(source).toContain('nextSyncToken')
    expect(source).toContain("event.status === 'cancelled'")
  })
})
