"use client"

import { CheckIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

export type ImportStep = "upload" | "map" | "test" | "import"

const STEPS: {
  id: ImportStep
  labelKey: "importStepUpload" | "importStepMap" | "importStepTest" | "importStepImport"
}[] = [
  { id: "upload", labelKey: "importStepUpload" },
  { id: "map", labelKey: "importStepMap" },
  { id: "test", labelKey: "importStepTest" },
  { id: "import", labelKey: "importStepImport" },
]

type Props = {
  step: ImportStep
  /** The furthest step reached; earlier steps can be opened again. */
  reached: ImportStep
  disabled?: boolean
  onGo: (step: ImportStep) => void
}

/** The four steps in order; finished ones show a check and can be reopened. */
export function ImportStepper({ step, reached, disabled, onGo }: Props) {
  const { t } = useLanguage()
  const current = STEPS.findIndex((s) => s.id === step)
  const furthest = STEPS.findIndex((s) => s.id === reached)

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((item, index) => {
        const done = index < current
        const active = index === current
        const canOpen = !disabled && index <= furthest && index !== current && index < 3
        return (
          <li key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canOpen}
              aria-current={active ? "step" : undefined}
              onClick={() => onGo(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-white shadow-sm"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300"
                    : "border-[#e2d6c8] bg-white text-muted-foreground",
                !canOpen && !active && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  active ? "bg-white/25" : done ? "bg-emerald-600 text-white" : "bg-[#f3ebe3]"
                )}
                aria-hidden
              >
                {done ? <CheckIcon className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              {t(item.labelKey)}
            </button>
            {index < STEPS.length - 1 ? (
              <span className="hidden h-px w-5 bg-[#e2d6c8] sm:block" aria-hidden />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
