// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@cadentra/domain'
import { AddTaskModal } from '../App'

function taskAt(hour: number, minute: number, duration: number): Task {
  const start = new Date(); start.setHours(hour, minute, 0, 0)
  return { id: 'task-1', userId: 'user-1', title: 'ประชุมทีม', start: start.toISOString(), end: new Date(start.getTime() + duration * 60_000).toISOString(), category: 'งาน', priority: 'medium', status: 'planned' }
}

describe('AddTaskModal schedule preview', () => {
  afterEach(cleanup)

  it('requires explicit confirmation when the proposed time overlaps', () => {
    const onAdd = vi.fn()
    render(<AddTaskModal goals={[]} tasks={[taskAt(15, 30, 60)]} onClose={vi.fn()} onAdd={onAdd}/>)
    fireEvent.change(screen.getByLabelText('สิ่งที่ต้องทำ'), { target: { value: 'เขียนรายงาน' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มลงตาราง' }))
    expect(screen.getByText('เวลานี้ชนกับ 1 งาน')).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันเพิ่มงาน' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })
})
