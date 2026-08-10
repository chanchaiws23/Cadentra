// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it } from 'vitest'
import { AppToaster } from './AppToaster'

describe('AppToaster', () => {
  afterEach(() => toast.dismiss())

  it('provides a named notification region', () => {
    render(<AppToaster/>)

    expect(screen.getByLabelText(/^การแจ้งเตือน Cadentra/)).toHaveAttribute('aria-live', 'polite')
  })

  it('announces success messages', async () => {
    render(<AppToaster/>)

    toast.success('บันทึกเรียบร้อย')

    expect(await screen.findByText('บันทึกเรียบร้อย')).toBeInTheDocument()
  })
})
