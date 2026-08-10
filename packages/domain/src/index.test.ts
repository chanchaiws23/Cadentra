import { describe, expect, it } from 'vitest'
import { completionRate, isOverlapping, nextStreak, pointsForCompletion, type Task } from './index'

const task = (overrides: Partial<Task>): Task => ({
  id: '1', userId: 'u1', title: 'Task', start: '2026-08-04T08:00:00Z',
  end: '2026-08-04T09:00:00Z', category: 'work', priority: 'medium', status: 'planned', ...overrides,
})

describe('discipline rules', () => {
  it('calculates completion without division errors', () => {
    expect(completionRate([])).toBe(0)
    expect(completionRate([task({ status: 'done' }), task({ id: '2' })])).toBe(50)
  })
  it('detects true time overlap but allows adjacent blocks', () => {
    expect(isOverlapping(task({}), task({ start: '2026-08-04T08:30:00Z' }))).toBe(true)
    expect(isOverlapping(task({}), task({ start: '2026-08-04T09:00:00Z', end: '2026-08-04T10:00:00Z' }))).toBe(false)
  })
  it('never punishes a missed day and rewards a return', () => {
    expect(nextStreak(8, false)).toBe(8)
    expect(pointsForCompletion('high', true)).toBe(20)
  })
})

