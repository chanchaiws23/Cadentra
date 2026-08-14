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
const notificationProps = { notificationRule: null, notificationPermission: 'default' as const, onSaveNotificationRule: vi.fn().mockResolvedValue(true), onRequestNotificationPermission: vi.fn().mockResolvedValue(undefined), onSendTestNotification: vi.fn().mockResolvedValue(undefined), calendarConnection: null, onConnectGoogleCalendar: vi.fn().mockResolvedValue(undefined), onSyncGoogleCalendar: vi.fn().mockResolvedValue(undefined), onDisconnectGoogleCalendar: vi.fn().mockResolvedValue(undefined) }

describe('SettingsView', () => {
  afterEach(cleanup)

  it('edits and submits cloud profile preferences', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<SettingsView {...notificationProps} profile={profile} email="chai@example.com" onSave={onSave} onExport={vi.fn()} onDelete={vi.fn()}/>)

    fireEvent.change(screen.getByLabelText('ชื่อที่แสดง'), { target: { value: 'ชัย' } })
    fireEvent.click(screen.getByLabelText('เปิดคะแนนและเลเวล'))
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'ชัย', gamificationEnabled: false })))
  })

  it('requires the account email before permanent deletion', async () => {
    const onExport = vi.fn().mockResolvedValue(true)
    const onDelete = vi.fn().mockResolvedValue(true)
    render(<SettingsView {...notificationProps} profile={profile} email="chai@example.com" onSave={vi.fn().mockResolvedValue(true)} onExport={onExport} onDelete={onDelete}/>)

    fireEvent.click(screen.getByRole('button', { name: 'ดาวน์โหลด JSON' }))
    await waitFor(() => expect(onExport).toHaveBeenCalledOnce())

    const deleteButton = screen.getByRole('button', { name: 'ลบบัญชีและข้อมูลทั้งหมด' })
    expect(deleteButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('พิมพ์อีเมลของคุณเพื่อยืนยัน'), { target: { value: 'chai@example.com' } })
    expect(deleteButton).toBeEnabled()
    fireEvent.click(deleteButton)
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce())
  })

  it('saves quiet hours and requests browser permission explicitly', async () => {
    const onSaveNotificationRule = vi.fn().mockResolvedValue(true)
    const onRequestNotificationPermission = vi.fn().mockResolvedValue(undefined)
    render(<SettingsView {...notificationProps} onSaveNotificationRule={onSaveNotificationRule} onRequestNotificationPermission={onRequestNotificationPermission} profile={profile} email="chai@example.com" onSave={vi.fn().mockResolvedValue(true)} onExport={vi.fn()} onDelete={vi.fn()}/>)
    fireEvent.click(screen.getByLabelText('เปิดการแจ้งเตือนบนอุปกรณ์นี้'))
    fireEvent.change(screen.getByLabelText('จำกัดการแจ้งเตือนต่อวัน'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'ลงทะเบียน Push บนอุปกรณ์นี้' }))
    expect(onRequestNotificationPermission).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))
    await waitFor(() => expect(onSaveNotificationRule).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, dailyLimit: 4 })))
  })

  it('starts Google Calendar connection explicitly', async () => {
    const onConnectGoogleCalendar = vi.fn().mockResolvedValue(undefined)
    render(<SettingsView {...notificationProps} onConnectGoogleCalendar={onConnectGoogleCalendar} profile={profile} email="chai@example.com" onSave={vi.fn().mockResolvedValue(true)} onExport={vi.fn()} onDelete={vi.fn()}/>)
    fireEvent.click(screen.getByRole('button', { name: 'เชื่อมต่อ Google Calendar' }))
    await waitFor(() => expect(onConnectGoogleCalendar).toHaveBeenCalledOnce())
  })
})
