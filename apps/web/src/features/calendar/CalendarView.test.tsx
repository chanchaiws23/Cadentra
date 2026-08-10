// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { CalendarView } from './CalendarView'

const task: Task = {
  id: 'task-1', userId: 'user-1', title: 'วางแผนสัปดาห์',
  start: '2026-08-10T02:00:00.000Z', end: '2026-08-10T03:00:00.000Z',
  category: 'งาน', priority: 'high', status: 'planned',
}

afterEach(cleanup)

describe('CalendarView', () => {
  it('renders scheduled tasks and reports the selected task', () => {
    const onTask = vi.fn()
    render(<LocaleProvider><CalendarView tasks={[task]} onTask={onTask} onReschedule={vi.fn()}/></LocaleProvider>)

    expect(screen.getByRole('heading', { name: 'ปฏิทิน' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /วางแผนสัปดาห์/ }))
    fireEvent.click(screen.getByRole('button', { name: 'ทำเสร็จ' }))
    expect(onTask).toHaveBeenCalledWith(task)
  })

  it('marks every visible task involved in a time conflict', () => {
    const overlapping = { ...task, id: 'task-2', title: 'งานที่ชน', start: '2026-08-10T02:30:00.000Z', end: '2026-08-10T03:30:00.000Z' }
    render(<LocaleProvider><CalendarView tasks={[task, overlapping]} onTask={vi.fn()} onReschedule={vi.fn()}/></LocaleProvider>)
    expect(screen.getAllByLabelText('เวลาชน')).toHaveLength(2)
  })

  it('previews and confirms a duration change', () => {
    const onReschedule = vi.fn()
    render(<LocaleProvider><CalendarView tasks={[task]} onTask={vi.fn()} onReschedule={onReschedule}/></LocaleProvider>)
    fireEvent.click(screen.getByRole('button', { name: /วางแผนสัปดาห์/ }))

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มระยะเวลา 15 นาที' }))
    expect(screen.getByRole('heading', { name: 'ตรวจสอบเวลาใหม่' })).toBeTruthy()
    expect(screen.getByText('ช่วงเวลานี้ไม่มีงานชนกัน')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกเวลาใหม่' }))

    expect(onReschedule).toHaveBeenCalledWith(task, task.start, '2026-08-10T03:15:00.000Z')
  })

  it('previews a drag to another calendar slot', () => {
    const onReschedule = vi.fn()
    render(<LocaleProvider><CalendarView tasks={[task]} onTask={vi.fn()} onReschedule={onReschedule}/></LocaleProvider>)
    const values = new Map<string, string>()
    const dataTransfer = { setData: (type: string, value: string) => values.set(type, value), getData: (type: string) => values.get(type) ?? '', effectAllowed: '' }

    fireEvent.dragStart(screen.getByRole('button', { name: /วางแผนสัปดาห์/ }), { dataTransfer })
    fireEvent.drop(screen.getByRole('button', { name: 'ย้ายไป 2026-08-11 เวลา 10:00' }), { dataTransfer })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกเวลาใหม่' }))

    expect(onReschedule).toHaveBeenCalledWith(task, '2026-08-11T03:00:00.000Z', '2026-08-11T04:00:00.000Z')
  })
})
