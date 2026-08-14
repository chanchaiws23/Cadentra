import { describe, expect, it, vi } from 'vitest'
import { motivationProgress } from './motivation'

describe('motivation progress', () => {
  it('earns badges without removing prior achievements after a missed day', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-14T10:00:00Z'))
    const task = { id: 't', userId: 'u', title: 'Done', start: '2026-08-12T01:00:00Z', end: '2026-08-12T02:00:00Z', category: '', priority: 'medium' as const, status: 'done' as const }
    const habit = { id: 'h', userId: 'u', title: 'Read', cue: '', target: 1, unit: 'ครั้ง', type: 'boolean' as const, recurrenceRule: 'FREQ=DAILY', freezeBalance: 0, streak: 7, completedDates: [], checkIns: [] }
    const result = motivationProgress([task], [habit], [], 300)
    expect(result.badges.filter((badge) => badge.earned).map((badge) => badge.code)).toEqual(['first_step', 'steady_week', 'deep_focus'])
    expect(result.quest.current).toBe(1)
    vi.useRealTimers()
  })
})
