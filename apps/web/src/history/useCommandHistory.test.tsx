// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCommandHistory } from './useCommandHistory'

afterEach(cleanup)

describe('useCommandHistory', () => {
  it('moves successful commands between undo and redo stacks', async () => {
    const undo = vi.fn(async () => true)
    const redo = vi.fn(async () => true)
    const { result } = renderHook(() => useCommandHistory())

    act(() => result.current.push({ label: 'เปลี่ยนสถานะงาน', undo, redo }))
    expect(result.current.canUndo).toBe(true)
    expect(result.current.undoLabel).toBe('เปลี่ยนสถานะงาน')

    await act(() => result.current.undo())
    expect(undo).toHaveBeenCalledOnce()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)

    await act(() => result.current.redo())
    expect(redo).toHaveBeenCalledOnce()
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('keeps a command available when its inverse fails', async () => {
    const { result } = renderHook(() => useCommandHistory())
    act(() => result.current.push({ label: 'ลบงาน', undo: async () => false, redo: async () => true }))

    await act(() => result.current.undo())

    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('clears redo commands after a new change', async () => {
    const { result } = renderHook(() => useCommandHistory())
    const command = { label: 'คำสั่งแรก', undo: async () => true, redo: async () => true }
    act(() => result.current.push(command))
    await act(() => result.current.undo())

    act(() => result.current.push({ ...command, label: 'คำสั่งใหม่' }))

    expect(result.current.canRedo).toBe(false)
    expect(result.current.undoLabel).toBe('คำสั่งใหม่')
  })

  it('does not undo a stale toast command after a newer change', async () => {
    const first = { label: 'ลบงานแรก', undo: vi.fn(async () => true), redo: async () => true }
    const latest = { label: 'เปลี่ยนงานล่าสุด', undo: vi.fn(async () => true), redo: async () => true }
    const { result } = renderHook(() => useCommandHistory())
    act(() => { result.current.push(first); result.current.push(latest) })

    await act(() => result.current.undo(first))

    expect(first.undo).not.toHaveBeenCalled()
    expect(latest.undo).not.toHaveBeenCalled()
    expect(result.current.undoLabel).toBe('เปลี่ยนงานล่าสุด')
  })
})
