// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoachDialog } from './CoachDialog'
afterEach(cleanup)
describe('CoachDialog', () => {
  it('requires preview selection before applying AI changes', async () => {
    const proposal = { id: 'p', status: 'draft' as const, reason: 'Balance', createdAt: '', changes: [{ id: 'c', taskId: 't', action: 'move' as const, before: { start: '2026-08-14T01:00:00Z', end: '2026-08-14T02:00:00Z' }, after: { start: '2026-08-14T03:00:00Z', end: '2026-08-14T04:00:00Z' }, accepted: false }] }
    const onApply = vi.fn().mockResolvedValue(true)
    render(<CoachDialog tasks={[]} proposals={[proposal]} healthConsent={false} onClose={vi.fn()} onGenerate={vi.fn().mockResolvedValue(true)} onApply={onApply} onReject={vi.fn().mockResolvedValue(true)} onUndo={vi.fn().mockResolvedValue(true)}/>)
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน 1 รายการ' }))
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(proposal, ['c']))
  })
})
