"use client"

import { type ReactNode, useEffect } from "react"
import { createPortal } from "react-dom"

import { cn } from "cn"

export function LeadSheetFocusShell({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      data-lead-sheet-focus-shell=""
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-[#f7f7f5]",
        className
      )}
    >
      {children}
    </div>,
    document.body
  )
}
