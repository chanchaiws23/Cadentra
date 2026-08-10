import { describe, expect, it } from 'vitest'
import type { Task } from './index'
import { expandRecurringTasks } from './recurrence'

const task: Task = { id: 'task-1', userId: 'user-1', title: 'Read', start: '2026-08-10T02:00:00Z', end: '2026-08-10T03:00:00Z', category: 'study', priority: 'medium', status: 'planned', recurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' }

describe('recurring task expansion', () => {
  it('creates weekday occurrences without pre-creating future task rows', () => {
    const result = expandRecurringTasks([task], [], '2026-08-10', '2026-08-16', 'Asia/Bangkok')
    expect(result.map((entry) => entry.occurrenceDate)).toEqual(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14'])
  })

  it('applies a stored status to one occurrence only', () => {
    const result = expandRecurringTasks([task], [{ taskId: 'task-1', localDate: '2026-08-11', status: 'done' }], '2026-08-10', '2026-08-12', 'Asia/Bangkok')
    expect(result.map((entry) => entry.status)).toEqual(['planned', 'done', 'planned'])
  })
})
