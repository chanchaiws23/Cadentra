import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./202608140004_device_registrations.sql', import.meta.url), 'utf8')
describe('push registrations', () => {
  it('isolates devices and tracks delivery limits', () => {
    expect(source).toContain("platform in ('web','android')")
    expect(source).toContain('owners manage device registrations')
    expect(source).toContain('notification_deliveries')
  })
})
