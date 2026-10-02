"use client"

import type { ReactNode } from "react"

type Props = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function AdminPageIntro({ title, description, action, icon }: Props) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
