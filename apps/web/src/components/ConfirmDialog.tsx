import type { ReactElement } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { TriangleAlert } from 'lucide-react'

interface ConfirmDialogProps {
  trigger: ReactElement
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  tone = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const destructive = tone === 'danger'

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-[#20231f66] backdrop-blur-[3px] data-[state=open]:animate-[dialog-overlay-in_160ms_ease-out] motion-reduce:animate-none"/>
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-[71] w-[min(440px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 text-ink shadow-[0_30px_90px_rgba(32,35,31,0.28)] data-[state=open]:animate-[dialog-content-in_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none max-[480px]:p-5">
          {destructive && (
            <span className="mb-4 grid size-10 place-items-center rounded-xl bg-[#f3e5e1] text-[#9b493f]" aria-hidden="true">
              <TriangleAlert size={20} strokeWidth={1.9}/>
            </span>
          )}
          <AlertDialog.Title className="font-display m-0 text-[24px] leading-tight font-medium tracking-[-0.025em]">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 mb-0 text-[13px] leading-6 text-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2.5 max-[480px]:flex-col-reverse">
            <AlertDialog.Cancel asChild>
              <button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#ecebe5] px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-[#e2e1da] max-[480px]:w-full">
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className={destructive
                  ? 'inline-flex min-h-10 items-center justify-center rounded-lg bg-[#9b493f] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#863d35] max-[480px]:w-full'
                  : 'inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#195b42] max-[480px]:w-full'}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
