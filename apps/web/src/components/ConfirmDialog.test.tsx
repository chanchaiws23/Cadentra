// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  afterEach(cleanup)

  it('announces its content and waits for explicit confirmation', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        trigger={<button>ลบงาน</button>}
        title="ลบงานนี้หรือไม่"
        description="งานจะถูกนำออกจากตาราง"
        confirmLabel="ลบงาน"
        tone="danger"
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'ลบงาน' }))

    const dialog = screen.getByRole('alertdialog', { name: 'ลบงานนี้หรือไม่' })
    expect(dialog).toHaveAccessibleDescription('งานจะถูกนำออกจากตาราง')
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'ลบงาน' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('closes on Escape without confirming', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        trigger={<button>เปิด</button>}
        title="ยืนยัน"
        description="ตรวจสอบอีกครั้ง"
        confirmLabel="ยืนยัน"
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'เปิด' }))
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape', code: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
