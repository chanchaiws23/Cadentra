import type { ReactNode } from 'react'

interface PageHeadingProps {
  eyebrow: string
  title: string
  detail: string
  action?: ReactNode
}

export function PageHeading({ eyebrow, title, detail, action }: PageHeadingProps) {
  return (
    <div className="mb-[26px] flex items-end justify-between gap-6 max-[820px]:mb-[22px] max-[820px]:flex-col max-[820px]:items-start">
      <div>
        <p className="text-accent! mb-[7px]! text-[10px]! font-bold tracking-[0.13em] uppercase">{eyebrow}</p>
        <h1 className="font-display mb-1.5 text-[34px] leading-tight font-medium tracking-[-0.035em] max-[820px]:text-[29px]">{title}</h1>
        <p className="text-muted m-0 text-sm">{detail}</p>
      </div>
      {action}
    </div>
  )
}
