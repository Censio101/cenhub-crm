"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircleIcon, CheckCircle2Icon, TriangleAlertIcon, XIcon } from "lucide-react"

import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { cn } from "cn"

type FormNoticeProps = {
  message: string
  tone?: "error" | "success" | "warning"
  onDismiss: () => void
  autoDismissMs?: number
  dismissLabel?: string
  size?: "sm" | "md"
  dismissible?: boolean
  className?: string
}

const toneStyles = {
  error: {
    box: "border-red-200/90 bg-red-50/95 text-red-900 shadow-[0_1px_2px_rgba(127,29,29,0.06)]",
    icon: "text-red-600",
    progress: "bg-red-500/35",
    dismiss: "text-red-700 hover:bg-red-100/80",
  },
  success: {
    box: "border-emerald-200/90 bg-emerald-50/95 text-emerald-900 shadow-[0_1px_2px_rgba(6,78,59,0.06)]",
    icon: "text-emerald-600",
    progress: "bg-emerald-500/35",
    dismiss: "text-emerald-700 hover:bg-emerald-100/80",
  },
  warning: {
    box: "border-amber-200/90 bg-amber-50/95 text-amber-950 shadow-[0_1px_2px_rgba(146,64,14,0.06)]",
    icon: "text-amber-600",
    progress: "bg-amber-500/35",
    dismiss: "text-amber-800 hover:bg-amber-100/80",
  },
} as const

function ToneIcon({ tone }: { tone: FormNoticeProps["tone"] }) {
  const className = cn("size-4 shrink-0", toneStyles[tone ?? "error"].icon)
  if (tone === "success") {
    return <CheckCircle2Icon className={className} aria-hidden="true" />
  }
  if (tone === "warning") {
    return <TriangleAlertIcon className={className} aria-hidden="true" />
  }
  return <AlertCircleIcon className={className} aria-hidden="true" />
}

type FormNoticeStackProps = {
  /** Non-dismissible status while an action is in flight (e.g. submitting). */
  progress?: string | null
  error?: string | null
  success?: string | null
  warning?: string | null
  onDismissError?: () => void
  onDismissSuccess?: () => void
  onDismissWarning?: () => void
  dismissLabel?: string
  size?: "sm" | "md"
  className?: string
  successAutoDismissMs?: number
  errorAutoDismissMs?: number
  warningAutoDismissMs?: number
}

/** Shared placement for form success, error, and warning messages. */
export function FormNoticeStack({
  progress,
  error,
  success,
  warning,
  onDismissError,
  onDismissSuccess,
  onDismissWarning,
  dismissLabel = "Dismiss",
  size = "md",
  className,
  successAutoDismissMs = 5000,
  errorAutoDismissMs = 6000,
  warningAutoDismissMs = 0,
}: FormNoticeStackProps) {
  const hasAny = Boolean(progress || error || success || warning)
  if (!hasAny) return null

  return (
    <div className={cn("grid gap-2", className)}>
      {progress ? (
        <FormNotice
          message={progress}
          tone="warning"
          size={size}
          autoDismissMs={0}
          dismissible={false}
          onDismiss={() => undefined}
        />
      ) : null}
      {error ? (
        <FormNotice
          message={error}
          tone="error"
          size={size}
          autoDismissMs={errorAutoDismissMs}
          dismissLabel={dismissLabel}
          onDismiss={onDismissError ?? (() => undefined)}
        />
      ) : null}
      {success ? (
        <FormNotice
          message={success}
          tone="success"
          size={size}
          autoDismissMs={successAutoDismissMs}
          dismissLabel={dismissLabel}
          onDismiss={onDismissSuccess ?? (() => undefined)}
        />
      ) : null}
      {warning ? (
        <FormNotice
          message={warning}
          tone="warning"
          size={size}
          autoDismissMs={warningAutoDismissMs}
          dismissLabel={dismissLabel}
          dismissible={warningAutoDismissMs > 0}
          onDismiss={onDismissWarning ?? (() => undefined)}
        />
      ) : null}
    </div>
  )
}

export function FormNotice({
  message,
  tone = "error",
  onDismiss,
  autoDismissMs = 6000,
  dismissLabel = "Dismiss",
  size = "md",
  dismissible = true,
  className,
}: FormNoticeProps) {
  const dismiss = useCallback(() => onDismiss(), [onDismiss])
  const styles = toneStyles[tone]
  const [progressKey, setProgressKey] = useState(0)

  useEffect(() => {
    setProgressKey((value) => value + 1)
  }, [message])

  useAutoDismiss(autoDismissMs > 0 ? message : null, dismiss, autoDismissMs)

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border animate-in fade-in-0 slide-in-from-top-1 duration-200",
        styles.box,
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <div
        className={cn(
          "flex items-start gap-2.5 pr-1",
          size === "sm" ? "px-3 py-2.5 text-[12px] leading-snug" : "px-4 py-3 text-sm leading-normal"
        )}
      >
        <span className="mt-0.5">
          <ToneIcon tone={tone} />
        </span>
        <p className="min-w-0 flex-1 font-medium">{message}</p>
        {dismissible ? (
          <button
            type="button"
            onClick={dismiss}
            className={cn(
              "shrink-0 rounded-md p-1 transition-colors",
              styles.dismiss
            )}
            aria-label={dismissLabel}
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {autoDismissMs > 0 ? (
        <div
          className="h-0.5 w-full bg-black/[0.04]"
          aria-hidden="true"
        >
          <div
            key={progressKey}
            className={cn("h-full w-full origin-left [animation-name:form-notice-progress] [animation-timing-function:linear] [animation-fill-mode:forwards]", styles.progress)}
            style={{ animationDuration: `${autoDismissMs}ms` }}
          />
        </div>
      ) : null}
    </div>
  )
}
