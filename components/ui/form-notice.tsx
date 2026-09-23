"use client"

import { useCallback } from "react"
import { XIcon } from "lucide-react"

import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { cn } from "cn"

type FormNoticeProps = {
  message: string
  tone?: "error" | "success"
  onDismiss: () => void
  autoDismissMs?: number
  className?: string
}

export function FormNotice({
  message,
  tone = "error",
  onDismiss,
  autoDismissMs = 6000,
  className,
}: FormNoticeProps) {
  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  useAutoDismiss(message, dismiss, autoDismissMs)

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        className={cn(
          "shrink-0 rounded-md p-0.5 transition-colors",
          tone === "error"
            ? "text-red-700 hover:bg-red-100"
            : "text-emerald-700 hover:bg-emerald-100"
        )}
        aria-label="Dismiss"
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
