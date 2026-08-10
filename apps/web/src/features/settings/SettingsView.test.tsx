// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@cadentra/domain'
import { SettingsView } from './SettingsView'

const profile: UserProfile = {
  id: 'user-1', displayName: 'Chai', timezone: 'Asia/Bangkok', locale: 'th',
  gamificationEnabled: true, healthAiConsent: false,
}

describe('SettingsView', () => {
  it('edits and submits cloud profile preferences', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<SettingsView profile={profile} email="chai@example.com" onSave={onSave}/>)

    fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'ชัย' } })
    fireEvent.click(screen.getByLabelText('เปิดคะแนนและเลเวล'))
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'ชัย', gamificationEnabled: false })))
  })
})
