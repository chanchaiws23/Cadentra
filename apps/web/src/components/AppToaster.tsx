import { CheckCircle2, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      duration={3_200}
      gap={10}
      visibleToasts={4}
      closeButton
      expand={false}
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 16, left: 16, right: 16 }}
      containerAriaLabel="การแจ้งเตือน Cadentra"
      icons={{
        success: <CheckCircle2 size={18} strokeWidth={2}/>,
        info: <Info size={18} strokeWidth={2}/>,
        warning: <TriangleAlert size={18} strokeWidth={2}/>,
        error: <CircleAlert size={18} strokeWidth={2}/>,
        loading: <LoaderCircle className="animate-spin" size={18} strokeWidth={2}/>,
        close: <X size={14} strokeWidth={2}/>,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: 'ปิดการแจ้งเตือน',
        classNames: {
          toast: 'group flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-ink shadow-[0_14px_40px_rgba(34,37,31,0.16)]',
          content: 'min-w-0 flex-1',
          title: 'text-[13px] font-semibold leading-5',
          description: 'mt-0.5 text-[11px] leading-4 text-muted',
          icon: 'mt-0.5 text-muted group-data-[type=success]:text-accent group-data-[type=info]:text-[#4f7390] group-data-[type=warning]:text-warm group-data-[type=error]:text-[#a34d42]',
          closeButton: 'ml-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-[#ecebe5] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          actionButton: 'rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#195b42]',
          cancelButton: 'rounded-lg bg-[#ecebe5] px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-[#e2e1da]',
          success: 'border-l-[3px] border-l-accent',
          info: 'border-l-[3px] border-l-[#4f7390]',
          warning: 'border-l-[3px] border-l-warm',
          error: 'border-l-[3px] border-l-[#a34d42]',
        },
      }}
    />
  )
}
