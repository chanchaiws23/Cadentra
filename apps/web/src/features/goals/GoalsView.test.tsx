// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Goal, Milestone } from '@cadentra/domain'
import { GoalsView } from './GoalsView'

const goal: Goal = { id: 'goal-1', userId: 'user-1', title: 'Speak English', description: 'Confident conversations', status: 'planned', targetDate: '2026-12-31', updatedAt: '' }
const milestone: Milestone = { id: 'milestone-1', userId: 'user-1', goalId: 'goal-1', title: 'Talk for 15 minutes', status: 'planned', sortOrder: 0, updatedAt: '' }

function props(overrides = {}) {
  return {
    goals: [goal], milestones: [milestone], tasks: [],
    onCreateGoal: vi.fn().mockResolvedValue(undefined), onToggleGoal: vi.fn().mockResolvedValue(undefined), onDeleteGoal: vi.fn().mockResolvedValue(undefined),
    onCreateMilestone: vi.fn().mockResolvedValue(undefined), onToggleMilestone: vi.fn().mockResolvedValue(undefined), onDeleteMilestone: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('GoalsView', () => {
  afterEach(cleanup)

  it('shows goal progress and toggles a milestone', async () => {
    const viewProps = props()
    render(<GoalsView {...viewProps}/>)
    expect(screen.getAllByText('Speak English')).toHaveLength(2)
    expect(screen.getByText('Talk for 15 minutes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนสถานะ Talk for 15 minutes' }))
    await waitFor(() => expect(viewProps.onToggleMilestone).toHaveBeenCalledWith(milestone))
  })

  it('creates the first goal from the empty state', async () => {
    const viewProps = props({ goals: [], milestones: [] })
    render(<GoalsView {...viewProps}/>)
    fireEvent.click(screen.getByRole('button', { name: 'สร้างเป้าหมายแรก' }))
    fireEvent.change(screen.getByLabelText('ชื่อเป้าหมาย'), { target: { value: 'Read 12 books' } })
    fireEvent.click(screen.getByRole('button', { name: 'สร้างเป้าหมาย' }))
    await waitFor(() => expect(viewProps.onCreateGoal).toHaveBeenCalledWith('Read 12 books', '', undefined))
  })
})
