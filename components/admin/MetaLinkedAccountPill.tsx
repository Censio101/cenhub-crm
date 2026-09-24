"use client"

import { CheckCircle2Icon, MegaphoneIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

type Props = {
  accountName: string
  metaAdAccountId: string
  className?: string
  /** Pending approve — not yet saved */
  pending?: boolean
}

export function MetaLinkedAccountPill({
  accountName,
  metaAdAccountId,
  className,
  pending = false,
}: Props) {
  const { t } = useLanguage()
  const id = metaAdAccountId.replace(/^act_/i, "")

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
        pending
          ? "border-blue-200/80 bg-blue-50/60"
          : "border-blue-200/90 bg-blue-50/95 shadow-[0_1px_2px_rgba(24,119,242,0.08)]",
        className
      )}
      role="status"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          pending ? "bg-blue-100/80 text-[#1877F2]" : "bg-blue-100 text-[#1877F2]"
        )}
        aria-hidden="true"
      >
        <MegaphoneIcon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-semibold leading-snug text-foreground">
            {accountName}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              pending
                ? "bg-[#1877F2]/12 text-[#166FE5]"
                : "bg-[#1877F2]/12 text-[#166FE5]"
            )}
          >
            {!pending ? (
              <CheckCircle2Icon className="size-3 shrink-0" aria-hidden="true" />
            ) : null}
            {pending ? t("onboardingMetaSelectedForApprove") : t("onboardingMetaLinkedPill")}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">act_{id}</p>
      </div>
    </div>
  )
}
