// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@cadentra/domain'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { FocusView } from './FocusView'

const task: Task = {
  id: 'task-1', userId: 'user-1', title: 'Deep work',
  start: '2026-08-10T02:00:00.000Z', end: '2026-08-10T03:00:00.000Z',
  category: 'งาน', priority: 'high', status: 'in_progress',
}

function renderFocus(notify = vi.fn()) {
  const onComplete = vi.fn()
  render(
    <LocaleProvider>
      <FocusView tasks={[task]} sessions={[]} notify={notify} onComplete={onComplete} durationSeconds={3}/>
    </LocaleProvider>,
  )
  return { notify, onComplete }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('FocusView', () => {
  it('starts, pauses, and resets the timer', () => {
    vi.useFakeTimers()
    renderFocus()

    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText('00:02')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'หยุดชั่วคราว' }))
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText('00:02')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'รีเซ็ตเวลา' }))
    expect(screen.getByText('00:03')).toBeTruthy()
  })

  it('notifies and restores the duration when a session completes', () => {
    vi.useFakeTimers()
    const { notify, onComplete } = renderFocus()

    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    act(() => vi.advanceTimersByTime(3_000))

    expect(notify).toHaveBeenCalledWith('จบช่วงโฟกัสแล้ว พักสายตาสักครู่')
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-1', elapsedSeconds: 3, interruptions: [] }))
    expect(screen.getByText('00:03')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เริ่มโฟกัส' })).toBeTruthy()
  })

  it('records an interruption and saves a partial session', () => {
    vi.useFakeTimers()
    const { onComplete } = renderFocus()
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    act(() => vi.advanceTimersByTime(1_000))

    fireEvent.click(screen.getByRole('button', { name: 'บันทึกสิ่งรบกวน' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'สิ่งที่รบกวน' }), { target: { value: 'ข้อความเข้า' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))
    expect(screen.getByText('ข้อความเข้า')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'จบและบันทึก' }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      elapsedSeconds: 1,
      interruptions: [expect.objectContaining({ reason: 'ข้อความเข้า', elapsedSeconds: 1 })],
    }))
  })

  it('separates paused time from focused time', () => {
    vi.useFakeTimers()
    const { onComplete } = renderFocus()
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มโฟกัส' }))
    act(() => vi.advanceTimersByTime(1_000))
    fireEvent.click(screen.getByRole('button', { name: 'หยุดชั่วคราว' }))
    act(() => vi.advanceTimersByTime(2_000))
    fireEvent.click(screen.getByRole('button', { name: 'จบและบันทึก' }))

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ elapsedSeconds: 1, pauseSeconds: 2 }))
  })
})
