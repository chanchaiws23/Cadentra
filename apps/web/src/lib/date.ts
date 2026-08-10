import { dateKeyInTimeZone } from '@cadentra/domain'

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export const todayKey = dateKeyInTimeZone(new Date(), userTimeZone)

export function formatTime(value: string, locale = 'th-TH', timeZone = userTimeZone): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))
}
