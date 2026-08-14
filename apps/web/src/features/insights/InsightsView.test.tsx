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
    render(<LocaleProvider><InsightsView tasks={[]} habits={[]} reflections={[]} points={20} focusMinutes={25} onSaveReflection={onSaveReflection} onExportCsv={onExportCsv}/></LocaleProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'รายสัปดาห์' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'สิ่งที่ทำได้ดี' }), { target: { value: 'ทำตามแผนได้' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการทบทวน' }))
    await waitFor(() => expect(onSaveReflection).toHaveBeenCalledWith(expect.objectContaining({ period: 'weekly', wins: 'ทำตามแผนได้' })))
    fireEvent.click(screen.getByRole('button', { name: 'ส่งออก CSV' }))
    expect(onExportCsv).toHaveBeenCalledOnce()
  })
})
