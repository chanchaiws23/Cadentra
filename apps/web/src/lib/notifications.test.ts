import { describe, expect, it } from 'vitest'
import type { NotificationRule } from '@cadentra/domain'
import { canSendNotification, isQuietTime } from './notifications'

const rule: NotificationRule = { userId: 'user-1', enabled: true, quietStart: '22:00', quietEnd: '07:00', dailyLimit: 3, focusBreakMinutes: 45 }
describe('notification limits', () => {
  it('supports quiet hours that cross midnight', () => {
    expect(isQuietTime(new Date(2026, 7, 14, 23, 0), '22:00', '07:00')).toBe(true)
    expect(isQuietTime(new Date(2026, 7, 14, 12, 0), '22:00', '07:00')).toBe(false)
  })
  it('honors disabled rules and daily limits', () => {
    expect(canSendNotification(rule, new Date(2026, 7, 14, 12, 0), 2)).toBe(true)
    expect(canSendNotification(rule, new Date(2026, 7, 14, 12, 0), 3)).toBe(false)
    expect(canSendNotification({ ...rule, enabled: false }, new Date(2026, 7, 14, 12, 0), 0)).toBe(false)
  })
})
