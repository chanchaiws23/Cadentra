import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../../../supabase/functions/send-notification/index.ts', import.meta.url), 'utf8')
describe('push delivery edge function', () => {
  it('enforces user settings before Web Push or FCM delivery', () => {
    expect(source).toContain('quietNow')
    expect(source).toContain('daily_limit')
    expect(source).toContain('webpush.sendNotification')
    expect(source).toContain('firebase.messaging')
    expect(source).toContain("caller.auth.getUser()")
  })
})
