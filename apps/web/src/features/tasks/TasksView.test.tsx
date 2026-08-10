// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { todayKey } from '../../lib/date'
import { TasksView } from './TasksView'

const task: Task = {
  id: 'task-1', userId: 'user-1', title: 'เตรียม Weekly Review',
  start: '2026-08-10T02:00:00.000Z', end: '2026-08-10T03:00:00.000Z',
  category: 'วางแผน', priority: 'high', status: 'planned',
}

describe('TasksView', () => {
  it('supports adding, selecting, and deleting a task after confirmation', () => {
    const onTask = vi.fn()
    const onDelete = vi.fn()
    const onAdd = vi.fn()
    render(<LocaleProvider><TasksView tasks={[task]} onTask={onTask} onDelete={onDelete} onAdd={onAdd}/></LocaleProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))
    fireEvent.click(screen.getByRole('button', { name: `เปลี่ยนสถานะ ${task.title}` }))
    fireEvent.click(screen.getByRole('button', { name: `ลบงาน ${task.title}` }))
    fireEvent.click(screen.getByRole('button', { name: 'ลบงาน' }))

    expect(onAdd).toHaveBeenCalledOnce()
    expect(onTask).toHaveBeenCalledWith(task)
    expect(onDelete).toHaveBeenCalledWith(task)
  })

  it('shows a weekday recurring series once with a clear weekly schedule', () => {
    const recurringTasks = createWeekdayOccurrences('series-1', 'เล่นเกม')
    const onTask = vi.fn()

    render(<LocaleProvider><TasksView tasks={recurringTasks} onTask={onTask} onDelete={vi.fn()} onAdd={vi.fn()}/></LocaleProvider>)

    expect(screen.getByRole('heading', { name: 'งานประจำ' })).toBeTruthy()
    expect(screen.getAllByText('เล่นเกม')).toHaveLength(1)
    expect(screen.getByText(/จ\.–ศ\. ·/)).toBeTruthy()
    expect(screen.getByLabelText('ตารางสัปดาห์ของ เล่นเกม').children).toHaveLength(5)

    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนสถานะวันนี้ เล่นเกม' }))
    expect(onTask).toHaveBeenCalledWith(expect.objectContaining({ sourceTaskId: 'series-1', occurrenceDate: todayKey }))
  })

  it('warns instead of silently merging identical recurring series', () => {
    const tasks = [
      ...createWeekdayOccurrences('series-1', 'เล่นเกม'),
      ...createWeekdayOccurrences('series-2', 'เล่นเกม'),
    ]

    render(<LocaleProvider><TasksView tasks={tasks} onTask={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()}/></LocaleProvider>)

    expect(screen.getByRole('alert').textContent).toContain('พบงานประจำที่เหมือนกัน 2 ชุด')
    expect(screen.getAllByText('เล่นเกม')).toHaveLength(2)
    expect(screen.getAllByText('ซ้ำ 2 ชุด')).toHaveLength(2)
  })
})

function createWeekdayOccurrences(sourceTaskId: string, title: string): Task[] {
  const now = new Date()
  now.setHours(15, 30, 0, 0)
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const week = Array.from({ length: 5 }, (_, index) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() + index)
    const occurrenceDate = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, '0'), String(start.getDate()).padStart(2, '0')].join('-')
    return { start, occurrenceDate }
  })

  if (!week.some((entry) => entry.occurrenceDate === todayKey)) week.push({ start: now, occurrenceDate: todayKey })

  return week.map(({ start, occurrenceDate }) => ({
    id: `${sourceTaskId}@${occurrenceDate}`,
    sourceTaskId,
    occurrenceDate,
    userId: 'user-1',
    title,
    start: start.toISOString(),
    end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    category: 'ทั่วไป',
    priority: 'medium',
    status: occurrenceDate === todayKey ? 'planned' : 'done',
    recurring: true,
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  }))
}

afterEach(cleanup)
