import { describe, expect, it } from 'vitest'
import { buildHabits, calculateCurrentStreak, mapProfileRow, mapTaskRow } from './cloud-data'

describe('cloud data mapping', () => {
  it('maps user profile preferences without exposing database column names', () => {
    expect(mapProfileRow({
      id: 'user-1', display_name: 'Chai', timezone: 'Asia/Bangkok', locale: 'th',
      gamification_enabled: false, health_ai_consent: true,
    })).toEqual({
      id: 'user-1', displayName: 'Chai', timezone: 'Asia/Bangkok', locale: 'th',
      gamificationEnabled: false, healthAiConsent: true,
    })
  })

  it('maps scheduled database tasks and excludes unscheduled rows from the calendar model', () => {
    const base = {
      id: 'task-1', user_id: 'user-1', title: 'Plan the day', category: 'planning',
      priority: 'high' as const, status: 'planned' as const, goal_id: null, recurrence_rule: null,
    }
    expect(mapTaskRow({ ...base, starts_at: null, ends_at: null })).toBeNull()
    expect(mapTaskRow({ ...base, starts_at: '2026-08-10T01:00:00Z', ends_at: '2026-08-10T02:00:00Z' })).toMatchObject({
      id: 'task-1', userId: 'user-1', start: '2026-08-10T01:00:00Z', recurring: false,
    })
  })

  it('builds habit completion and current streak from check-ins', () => {
    const habits = buildHabits(
      [{ id: 'habit-1', user_id: 'user-1', title: 'Read', cue: null, target: '20', unit: 'minutes' }],
      [
        { habit_id: 'habit-1', local_date: '2026-08-08' },
        { habit_id: 'habit-1', local_date: '2026-08-09' },
        { habit_id: 'habit-1', local_date: '2026-08-10' },
      ],
      '2026-08-10',
    )
    expect(habits[0]).toMatchObject({ target: 20, streak: 3, completedDates: ['2026-08-08', '2026-08-09', '2026-08-10'] })
    expect(calculateCurrentStreak(['2026-08-08', '2026-08-09'], '2026-08-10')).toBe(2)
  })
})
