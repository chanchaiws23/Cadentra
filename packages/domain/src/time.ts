type Instant = string | Date

function parseInstant(value: Instant): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date or timestamp')
  return date
}

export function toUtcIso(value: Instant): string {
  return parseInstant(value).toISOString()
}

export function isUtcIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false
  try {
    return toUtcIso(value).startsWith(value.replace(/Z$/, ''))
  } catch {
    return false
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format()
    return true
  } catch {
    return false
  }
}

export function dateKeyInTimeZone(value: Instant, timeZone: string): string {
  if (!isValidTimeZone(timeZone)) throw new RangeError(`Invalid time zone: ${timeZone}`)

  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parseInstant(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value

  return `${part('year')}-${part('month')}-${part('day')}`
}
