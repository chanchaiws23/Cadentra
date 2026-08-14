import type { NotificationRule } from '@cadentra/domain'

export function isQuietTime(now: Date, start: string, end: string) {
  const current = now.getHours() * 60 + now.getMinutes()
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const startValue = startHour * 60 + startMinute
  const endValue = endHour * 60 + endMinute
  return startValue <= endValue
    ? current >= startValue && current < endValue
    : current >= startValue || current < endValue
}

export function canSendNotification(rule: NotificationRule | null, now: Date, sentToday: number) {
  return Boolean(rule?.enabled && sentToday < rule.dailyLimit && !isQuietTime(now, rule.quietStart, rule.quietEnd))
}
