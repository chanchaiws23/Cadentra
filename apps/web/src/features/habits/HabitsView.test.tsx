// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Habit } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { HabitsView } from './HabitsView'

const habit: Habit = {
  id: 'habit-1', userId: 'user-1', title: 'อ่านหนังสือ', cue: 'หลังอาหารเช้า',
  target: 20, unit: 'นาที', streak: 3, completedDates: [],
}

describe('HabitsView', () => {
  it('renders habit progress and reports a check-in', () => {
    const onHabit = vi.fn()
    render(<LocaleProvider><HabitsView habits={[habit]} onHabit={onHabit} onAdd={vi.fn()}/></LocaleProvider>)

    expect(screen.getByRole('heading', { name: 'นิสัยของฉัน' })).toBeTruthy()
    expect(screen.getByText('3 วัน')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `เช็กอิน ${habit.title}` }))
    expect(onHabit).toHaveBeenCalledWith(habit)
  })
})
