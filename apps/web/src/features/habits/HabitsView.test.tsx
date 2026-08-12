// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Habit } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { HabitsView } from './HabitsView'

const habit: Habit = {
  id: 'habit-1', userId: 'user-1', title: 'อ่านหนังสือ', cue: 'หลังอาหารเช้า',
  target: 20, unit: 'นาที', type: 'duration', streak: 3, completedDates: [], checkIns: [],
}

describe('HabitsView', () => {
  it('renders habit progress and reports a check-in', () => {
    const onHabitValue = vi.fn()
    render(<LocaleProvider><HabitsView habits={[habit]} onHabitValue={onHabitValue} onAdd={vi.fn()}/></LocaleProvider>)

    expect(screen.getByRole('heading', { name: 'นิสัยของฉัน' })).toBeTruthy()
    expect(screen.getByText('3 วัน')).toBeTruthy()
    fireEvent.change(screen.getByRole('spinbutton', { name: `ค่าของ ${habit.title}` }), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    expect(onHabitValue).toHaveBeenCalledWith(habit, 25)
  })

  it('checks in a boolean habit directly', () => {
    const onHabitValue = vi.fn()
    const booleanHabit: Habit = { ...habit, type: 'boolean', target: 1, unit: 'ครั้ง' }
    render(<LocaleProvider><HabitsView habits={[booleanHabit]} onHabitValue={onHabitValue} onAdd={vi.fn()}/></LocaleProvider>)

    fireEvent.click(screen.getByRole('button', { name: `เช็กอิน ${habit.title}` }))
    expect(onHabitValue).toHaveBeenCalledWith(booleanHabit, 1)
  })
})
