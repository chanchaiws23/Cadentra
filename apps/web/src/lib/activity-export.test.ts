import { describe, expect, it } from 'vitest'
import { buildActivityCsv } from './activity-export'

describe('activity CSV export', () => {
  it('quotes commas and includes task, habit, and reflection rows', () => {
    const csv = buildActivityCsv(
      [{ id: 't', userId: 'u', title: 'Plan, review', start: '2026-08-14T01:00:00Z', end: '2026-08-14T02:00:00Z', category: 'work', priority: 'high', status: 'done' }],
      [{ id: 'h', userId: 'u', title: 'Read', cue: '', target: 20, unit: 'minutes', type: 'duration', recurrenceRule: 'FREQ=DAILY', freezeBalance: 0, streak: 1, completedDates: ['2026-08-14'], checkIns: [{ localDate: '2026-08-14', value: 20, frozen: false }] }],
      [{ id: 'r', userId: 'u', period: 'daily', localDate: '2026-08-14', wins: 'Focused', blockers: '', nextStep: 'Continue', createdAt: '2026-08-14T03:00:00Z' }],
    )
    expect(csv).toContain('"Plan, review"')
    expect(csv).toContain('"habit","2026-08-14","Read","done"')
    expect(csv).toContain('"reflection","2026-08-14","daily"')
  })
})
