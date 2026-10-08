"use client"

import { AlertCircleIcon, CheckIcon, Loader2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { SaveStatus } from "@/hooks/useLeads"
import { cn } from "cn"

/** Autosave feedback for the lead sheet: saving, saved, or failed (the edit stays on screen). */
export function SaveStatusBadge({ status }: { status: SaveStatus }) {
  const { t } = useLanguage()
  if (status === "idle") return null

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-[#15803d]",
        status === "error" && "text-[#b91c1c]"
      )}
    >
      {status === "saving" ? (
        <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
      ) : status === "saved" ? (
        <CheckIcon className="size-3.5" aria-hidden="true" />
      ) : (
        <AlertCircleIcon className="size-3.5" aria-hidden="true" />
      )}
      {status === "saving"
        ? t("leadSheetSaveSaving")
        : status === "saved"
          ? t("leadSheetSaveSaved")
          : t("leadSheetSaveError")}
    </span>
  )
}
