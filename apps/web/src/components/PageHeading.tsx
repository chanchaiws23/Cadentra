import type { ReactNode } from 'react'

interface PageHeadingProps {
  eyebrow: string
  title: string
  detail: string
  action?: ReactNode
}

export function PageHeading({ eyebrow, title, detail, action }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action}
    </div>
  )
}
