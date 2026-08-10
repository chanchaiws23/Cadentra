// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@cadentra/domain'
import { SettingsView } from './SettingsView'

const profile: UserProfile = {
  id: 'user-1', displayName: 'Chai', timezone: 'Asia/Bangkok', locale: 'th',
  gamificationEnabled: true, healthAiConsent: false,
}

describe('SettingsView', () => {
  afterEach(cleanup)

  it('edits and submits cloud profile preferences', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<SettingsView profile={profile} email="chai@example.com" onSave={onSave} onExport={vi.fn()} onDelete={vi.fn()}/>)

    fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'ชัย' } })
    fireEvent.click(screen.getByLabelText('เปิดคะแนนและเลเวล'))
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'ชัย', gamificationEnabled: false })))
  })

  it('requires the account email before permanent deletion', async () => {
    const onExport = vi.fn().mockResolvedValue(true)
    const onDelete = vi.fn().mockResolvedValue(true)
    render(<SettingsView profile={profile} email="chai@example.com" onSave={vi.fn()} onExport={onExport} onDelete={onDelete}/>)

    fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด JSON' }))
    await waitFor(() => expect(onExport).toHaveBeenCalledOnce())

    const deleteButton = screen.getByRole('button', { name: 'ลบบัญชีและข้อมูลทั้งหมด' })
    expect(deleteButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('พิมพ์อีเมลของคุณเพื่อยืนยัน'), { target: { value: 'chai@example.com' } })
    expect(deleteButton).toBeEnabled()
    fireEvent.click(deleteButton)
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce())
  })
})
