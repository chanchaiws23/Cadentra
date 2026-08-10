// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Task } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { CalendarView } from './CalendarView'

const task: Task = {
  id: 'task-1', userId: 'user-1', title: 'วางแผนสัปดาห์',
  start: '2026-08-10T02:00:00.000Z', end: '2026-08-10T03:00:00.000Z',
  category: 'งาน', priority: 'high', status: 'planned',
}

describe('CalendarView', () => {
  it('renders scheduled tasks and reports the selected task', () => {
    const onTask = vi.fn()
    render(<LocaleProvider><CalendarView tasks={[task]} onTask={onTask}/></LocaleProvider>)

    expect(screen.getByRole('heading', { name: 'ปฏิทิน' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /วางแผนสัปดาห์/ }))
    expect(onTask).toHaveBeenCalledWith(task)
  })

  it('marks every visible task involved in a time conflict', () => {
    const overlapping = { ...task, id: 'task-2', title: 'งานที่ชน', start: '2026-08-10T02:30:00.000Z', end: '2026-08-10T03:30:00.000Z' }
    render(<LocaleProvider><CalendarView tasks={[task, overlapping]} onTask={vi.fn()}/></LocaleProvider>)
    expect(screen.getAllByLabelText('เวลาชน')).toHaveLength(2)
  })
})
