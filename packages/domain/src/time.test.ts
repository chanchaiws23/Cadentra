import { describe, expect, it } from 'vitest'
import { dateKeyInTimeZone, isUtcIso, isValidTimeZone, toUtcIso } from './time'

describe('time rules', () => {
  it('normalizes absolute timestamps to UTC', () => {
    expect(toUtcIso('2026-08-10T09:30:00+07:00')).toBe('2026-08-10T02:30:00.000Z')
    expect(isUtcIso('2026-08-10T02:30:00.000Z')).toBe(true)
    expect(isUtcIso('2026-08-10T09:30:00+07:00')).toBe(false)
  })

  it('uses the user timezone when an instant crosses a date boundary', () => {
    const instant = '2026-08-09T18:30:00.000Z'
    expect(dateKeyInTimeZone(instant, 'UTC')).toBe('2026-08-09')
    expect(dateKeyInTimeZone(instant, 'Asia/Bangkok')).toBe('2026-08-10')
  })

  it('rejects invalid timestamps and timezone identifiers', () => {
    expect(isValidTimeZone('Asia/Bangkok')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(() => toUtcIso('not-a-date')).toThrow(RangeError)
    expect(() => dateKeyInTimeZone(new Date(), 'Mars/Olympus')).toThrow(RangeError)
  })
})
