// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { InsightsView } from './InsightsView'

afterEach(cleanup)

describe('InsightsView', () => {
  it('saves a weekly review and exports CSV', async () => {
    const onSaveReflection = vi.fn().mockResolvedValue(true)
    const onExportCsv = vi.fn()
    render(<LocaleProvider><InsightsView tasks={[]} habits={[]} reflections={[]} rewards={[]} points={20} focusMinutes={25} onSaveReflection={onSaveReflection} onExportCsv={onExportCsv} onExportPdf={vi.fn()} onCreateReward={vi.fn().mockResolvedValue(true)} onRedeemReward={vi.fn().mockResolvedValue(true)}/></LocaleProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'รายสัปดาห์' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'สิ่งที่ทำได้ดี' }), { target: { value: 'ทำตามแผนได้' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการทบทวน' }))
    await waitFor(() => expect(onSaveReflection).toHaveBeenCalledWith(expect.objectContaining({ period: 'weekly', wins: 'ทำตามแผนได้' })))
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }))
    expect(onExportCsv).toHaveBeenCalledOnce()
  })

  it('creates a personal reward', async () => {
    const onCreateReward = vi.fn().mockResolvedValue(true)
    render(<LocaleProvider><InsightsView tasks={[]} habits={[]} reflections={[]} rewards={[]} points={120} focusMinutes={0} onSaveReflection={vi.fn().mockResolvedValue(true)} onExportCsv={vi.fn()} onExportPdf={vi.fn()} onCreateReward={onCreateReward} onRedeemReward={vi.fn().mockResolvedValue(true)}/></LocaleProvider>)
    fireEvent.change(screen.getByRole('textbox', { name: 'ชื่อรางวัล' }), { target: { value: 'เล่นเกม 1 ชั่วโมง' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'คะแนนรางวัล' }), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))
    await waitFor(() => expect(onCreateReward).toHaveBeenCalledWith('เล่นเกม 1 ชั่วโมง', 100))
  })
})
