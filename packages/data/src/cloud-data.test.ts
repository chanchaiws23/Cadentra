import { describe, expect, it } from 'vitest'
import { buildHabits, calculateCurrentStreak, mapGoalRow, mapMilestoneRow, mapProfileRow, mapTaskRow } from './cloud-data'

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
      priority: 'high' as const, status: 'planned' as const, goal_id: null, recurrence_rule: null, updated_at: '2026-08-10T00:00:00Z',
    }
    expect(mapTaskRow({ ...base, starts_at: null, ends_at: null })).toBeNull()
    expect(mapTaskRow({ ...base, starts_at: '2026-08-10T01:00:00Z', ends_at: '2026-08-10T02:00:00Z' })).toMatchObject({
      id: 'task-1', userId: 'user-1', start: '2026-08-10T01:00:00Z', recurring: false, updatedAt: '2026-08-10T00:00:00Z',
    })
  })

  it('preserves a recurrence rule without materializing future task rows', () => {
    const task = mapTaskRow({ id: 'task-2', user_id: 'user-1', title: 'Read', category: 'study', priority: 'medium', status: 'planned', goal_id: null, recurrence_rule: 'FREQ=DAILY', updated_at: '', starts_at: '2026-08-10T01:00:00Z', ends_at: '2026-08-10T02:00:00Z' })
    expect(task).toMatchObject({ recurring: true, recurrenceRule: 'FREQ=DAILY' })
  })

  it('builds habit completion and current streak from check-ins', () => {
    const habits = buildHabits(
      [{ id: 'habit-1', user_id: 'user-1', title: 'Read', cue: null, target: '20', unit: 'minutes', habit_type: 'duration' }],
      [
        { habit_id: 'habit-1', local_date: '2026-08-08', value: 20 },
        { habit_id: 'habit-1', local_date: '2026-08-09', value: 25 },
        { habit_id: 'habit-1', local_date: '2026-08-10', value: 10 },
      ],
      '2026-08-10',
    )
    expect(habits[0]).toMatchObject({ target: 20, type: 'duration', streak: 2, completedDates: ['2026-08-08', '2026-08-09'] })
    expect(habits[0].checkIns).toEqual([
      { localDate: '2026-08-08', value: 20 },
      { localDate: '2026-08-09', value: 25 },
      { localDate: '2026-08-10', value: 10 },
    ])
    expect(calculateCurrentStreak(['2026-08-08', '2026-08-09'], '2026-08-10')).toBe(2)
  })

  it('maps goals and ordered milestones into domain models', () => {
    expect(mapGoalRow({ id: 'goal-1', user_id: 'user-1', title: 'Speak English', description: null, target_date: '2026-12-31', status: 'planned', updated_at: '2026-08-10T00:00:00Z' })).toMatchObject({ id: 'goal-1', description: '', targetDate: '2026-12-31' })
    expect(mapMilestoneRow({ id: 'milestone-1', user_id: 'user-1', goal_id: 'goal-1', title: 'First conversation', target_date: null, status: 'planned', sort_order: 2, updated_at: '2026-08-10T00:00:00Z' })).toMatchObject({ goalId: 'goal-1', sortOrder: 2 })
  })
})
