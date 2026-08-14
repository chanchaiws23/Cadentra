import type { Task } from '@cadentra/domain'

export function shiftSchedule(task: Task, minutes = 0, days = 0, durationMinutes = 0): Pick<Task, 'start' | 'end'> {
  const start = new Date(task.start)
  const end = new Date(task.end)
  start.setDate(start.getDate() + days)
  end.setDate(end.getDate() + days)
  start.setMinutes(start.getMinutes() + minutes)
  end.setMinutes(end.getMinutes() + minutes + durationMinutes)
  if (end.getTime() - start.getTime() < 15 * 60_000) end.setTime(start.getTime() + 15 * 60_000)
  return { start: start.toISOString(), end: end.toISOString() }
}
