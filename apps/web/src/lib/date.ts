import { dateKeyInTimeZone } from '@cadentra/domain'

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export const todayKey = dateKeyInTimeZone(new Date(), userTimeZone)

export function localDateKey(value: string | Date): string {
  return dateKeyInTimeZone(typeof value === 'string' ? new Date(value) : value, userTimeZone)
}

export function formatTime(value: string, locale = 'th-TH', timeZone = userTimeZone): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value))
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} นาที`
  return minutes ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`
}
