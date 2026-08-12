// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Habit, Task } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { TodayView } from './TodayView'

const task: Task = {
  id: 'task-1', userId: 'user-1', title: 'Deep work',
  start: '2026-08-10T02:00:00.000Z', end: '2026-08-10T03:00:00.000Z',
  category: 'งาน', priority: 'high', status: 'planned',
}

const habit: Habit = {
  id: 'habit-1', userId: 'user-1', title: 'อ่านหนังสือ', cue: 'หลังอาหารเช้า',
  target: 20, unit: 'นาที', type: 'duration', streak: 3, completedDates: [], checkIns: [],
}

describe('TodayView', () => {
  it('renders the daily plan from supplied tasks and habits', () => {
    render(
      <LocaleProvider>
        <TodayView
          tasks={[task]}
          habits={[habit]}
          rate={0}
          completedHabits={0}
          focusMinutes={0}
          displayName="chai"
          onTask={vi.fn()}
          onHabit={vi.fn()}
          onCoach={vi.fn()}
        />
      </LocaleProvider>,
    )

    expect(screen.getByRole('heading', { name: 'ตารางวันนี้' })).toBeTruthy()
    expect(screen.getAllByText('Deep work')).toHaveLength(2)
    expect(screen.getAllByText('0/1')).toHaveLength(2)
  })
})
