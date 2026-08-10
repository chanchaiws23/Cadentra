import type { Task, TaskOccurrence } from './index'
import { dateKeyInTimeZone } from './time'

const weekdays = new Set([1, 2, 3, 4, 5])

export function recurrenceMatches(rule: string, date: Date, baseDate: Date): boolean {
  if (rule === 'FREQ=DAILY') return true
  if (rule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return weekdays.has(date.getUTCDay())
  if (rule === 'FREQ=WEEKLY') return date.getUTCDay() === baseDate.getUTCDay()
  return false
}

export function expandRecurringTasks(tasks: readonly Task[], occurrences: readonly TaskOccurrence[], rangeStart: string, rangeEnd: string, timeZone: string): Task[] {
  const statusByOccurrence = new Map(occurrences.map((entry) => [`${entry.taskId}:${entry.localDate}`, entry.status]))
  const expanded: Task[] = []
  for (const task of tasks) {
    if (!task.recurrenceRule) { expanded.push(task); continue }
    const baseKey = dateKeyInTimeZone(task.start, timeZone)
    const baseDate = new Date(`${baseKey}T12:00:00Z`)
    const duration = new Date(task.end).getTime() - new Date(task.start).getTime()
    for (let cursor = new Date(`${rangeStart}T12:00:00Z`); cursor <= new Date(`${rangeEnd}T12:00:00Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const localDate = cursor.toISOString().slice(0, 10)
      if (localDate < baseKey || !recurrenceMatches(task.recurrenceRule, cursor, baseDate)) continue
      const dayOffset = Math.round((cursor.getTime() - baseDate.getTime()) / 86_400_000)
      const start = new Date(new Date(task.start).getTime() + dayOffset * 86_400_000)
      expanded.push({
        ...task,
        id: `${task.id}@${localDate}`,
        sourceTaskId: task.id,
        occurrenceDate: localDate,
        start: start.toISOString(),
        end: new Date(start.getTime() + duration).toISOString(),
        status: statusByOccurrence.get(`${task.id}:${localDate}`) ?? 'planned',
      })
    }
  }
  return expanded.sort((a, b) => a.start.localeCompare(b.start))
}
