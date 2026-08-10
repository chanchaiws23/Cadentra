export const todayKey = new Date().toISOString().slice(0, 10)

export function formatTime(value: string, locale = 'th-TH'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
