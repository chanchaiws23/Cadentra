import { describe, expect, it } from 'vitest'
import { buildHabits, calculateCurrentStreak, isHabitScheduled, mapCalendarConnectionRow, mapExternalCalendarEventRow, mapFocusSessionRow, mapGoalRow, mapMilestoneRow, mapNotificationRuleRow, mapProfileRow, mapReflectionRow, mapTaskRow } from './cloud-data'

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
      [{ id: 'habit-1', user_id: 'user-1', title: 'Read', cue: null, target: '20', unit: 'minutes', habit_type: 'duration', recurrence_rule: 'FREQ=DAILY', freeze_balance: 1 }],
      [
        { habit_id: 'habit-1', local_date: '2026-08-08', value: 20, is_freeze: false },
        { habit_id: 'habit-1', local_date: '2026-08-09', value: 0, is_freeze: true },
        { habit_id: 'habit-1', local_date: '2026-08-10', value: 10, is_freeze: false },
      ],
      '2026-08-10',
    )
    expect(habits[0]).toMatchObject({ target: 20, type: 'duration', recurrenceRule: 'FREQ=DAILY', freezeBalance: 1, streak: 2, completedDates: ['2026-08-08'] })
    expect(habits[0].checkIns).toEqual([
      { localDate: '2026-08-08', value: 20, frozen: false },
      { localDate: '2026-08-09', value: 0, frozen: true },
      { localDate: '2026-08-10', value: 10, frozen: false },
    ])
    expect(calculateCurrentStreak(['2026-08-08', '2026-08-09'], '2026-08-10')).toBe(2)
  })

  it('recognizes scheduled rest days', () => {
    const weekdays = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    expect(isHabitScheduled(weekdays, '2026-08-10')).toBe(true)
    expect(isHabitScheduled(weekdays, '2026-08-09')).toBe(false)
  })

  it('maps goals and ordered milestones into domain models', () => {
    expect(mapGoalRow({ id: 'goal-1', user_id: 'user-1', title: 'Speak English', description: null, target_date: '2026-12-31', status: 'planned', updated_at: '2026-08-10T00:00:00Z' })).toMatchObject({ id: 'goal-1', description: '', targetDate: '2026-12-31' })
    expect(mapMilestoneRow({ id: 'milestone-1', user_id: 'user-1', goal_id: 'goal-1', title: 'First conversation', target_date: null, status: 'planned', sort_order: 2, updated_at: '2026-08-10T00:00:00Z' })).toMatchObject({ goalId: 'goal-1', sortOrder: 2 })
  })

  it('maps focus detail and interruption history', () => {
    expect(mapFocusSessionRow({
      id: 'focus-1', user_id: 'user-1', task_id: 'task-1', planned_minutes: 25,
      elapsed_seconds: 1_200, pause_seconds: 60, interruption_count: 1,
      interruptions: [{ reason: 'โทรศัพท์', recordedAt: '2026-08-10T03:10:00Z', elapsedSeconds: 300 }],
      started_at: '2026-08-10T03:00:00Z', ended_at: '2026-08-10T03:21:00Z',
    })).toMatchObject({ id: 'focus-1', pauseSeconds: 60, interruptionCount: 1, status: 'completed' })
  })

  it('maps notification quiet hours without database names', () => {
    expect(mapNotificationRuleRow({ user_id: 'user-1', enabled: true, quiet_start: '22:00:00', quiet_end: '07:00:00', daily_limit: 5, focus_break_minutes: 45 })).toEqual({ userId: 'user-1', enabled: true, quietStart: '22:00', quietEnd: '07:00', dailyLimit: 5, focusBreakMinutes: 45 })
  })

  it('maps structured reflection content', () => {
    expect(mapReflectionRow({ id: 'review-1', user_id: 'user-1', period: 'weekly', local_date: '2026-08-14', content: { wins: 'Focused', nextStep: 'Repeat' }, created_at: '2026-08-14T00:00:00Z' })).toMatchObject({ period: 'weekly', wins: 'Focused', blockers: '', nextStep: 'Repeat' })
  })

  it('maps Google connection and read-only events', () => {
    expect(mapCalendarConnectionRow({ id: 'connection-1', provider: 'google', provider_account_id: 'chai@example.com', sync_status: 'idle', last_synced_at: null })).toMatchObject({ provider: 'google', accountId: 'chai@example.com' })
    expect(mapExternalCalendarEventRow({ id: 'event-1', connection_id: 'connection-1', title: 'Meeting', starts_at: '2026-08-14T01:00:00Z', ends_at: '2026-08-14T02:00:00Z', all_day: false })).toMatchObject({ title: 'Meeting', readOnly: true })
  })
})
