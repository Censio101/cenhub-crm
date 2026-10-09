"use client"

import { PencilIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { leadStatusLabelKey } from "@/lib/lead-sheet/lead-labels"
import { getLeadStatusClass, type Lead } from "@/lib/leads"
import { cn } from "cn"

/** Phone layout: one card per lead instead of the wide sheet. */
export function LeadCardList({
  leads,
  emptyText,
  onEdit,
}: {
  leads: readonly Lead[]
  emptyText: string
  onEdit: (id: string) => void
}) {
  const { t } = useLanguage()

  if (leads.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ul className="flex flex-col gap-2 p-3">
      {leads.map((lead) => (
        <li
          key={lead.id}
          className="rounded-xl border border-[#e8e0d8] bg-white px-3.5 py-3"
        >
          <div className="flex flex-col gap-1">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 truncate text-[15px] font-medium text-foreground">
                {lead.fullName || "–"}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    getLeadStatusClass(lead.status)
                  )}
                >
                  {t(leadStatusLabelKey(lead.status))}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(lead.id)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  aria-label={t("leadSheetEditLead")}
                  title={t("leadSheetEditLead")}
                >
                  <PencilIcon className="size-4" aria-hidden="true" />
                </button>
              </span>
            </span>
            {lead.email ? (
              <span className="truncate text-sm text-muted-foreground">{lead.email}</span>
            ) : null}
          </div>
          {lead.phone ? (
            <a
              href={`tel:${lead.phone.replace(/\s/g, "")}`}
              className="mt-1 inline-block text-sm text-primary"
            >
              {lead.phone}
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
