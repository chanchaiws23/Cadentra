// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Task } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
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
})
