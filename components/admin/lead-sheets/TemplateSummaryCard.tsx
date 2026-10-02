"use client"

import { PencilIcon, TagIcon } from "lucide-react"

import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { DefaultTemplateBadge } from "@/components/admin/lead-sheets/DefaultTemplateBadge"
import { TemplateUsageChip } from "@/components/admin/lead-sheets/TemplateUsageChip"
import { TemplateAssignedIndustryPills } from "@/components/admin/lead-sheets/TemplateAssignedIndustryPills"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { BusinessCategory } from "@/lib/lead-sheet/types"
import { cn } from "cn"

type Props = {
  name: string
  categoryIds: string[]
  categories: BusinessCategory[]
  isSystemDefault: boolean
  /** Clients on this template. Omit for a client's own sheet (no usage line). */
  usageCount?: number
  disabled?: boolean
  onEdit: () => void
  /** Use `h2` when the editor is embedded under another page heading. */
  headingAs?: "h1" | "h2"
}

/**
 * Compact "control panel" for a template: name and industry tags.
 * All editing happens in `TemplateDetailsDialog`.
 */
export function TemplateSummaryCard({
  name,
  categoryIds,
  categories,
  isSystemDefault,
  usageCount,
  disabled,
  onEdit,
  headingAs: Heading = "h1",
}: Props) {
  const { t } = useLanguage()

  return (
    <section
      className={cn(adminSectionCardClass, "px-4 py-3.5 sm:px-5")}
      aria-label={t("leadSheetsEditorDetailsHeading")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Heading
            className="truncate text-lg font-semibold tracking-tight text-foreground"
            title={name}
          >
            {name}
          </Heading>
          {usageCount !== undefined ? (
            <TemplateUsageChip count={usageCount} size="summary" />
          ) : null}
          {isSystemDefault ? <DefaultTemplateBadge size="summary" /> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("shrink-0", adminOutlineButtonClass)}
          disabled={disabled}
          onClick={onEdit}
        >
          <PencilIcon aria-hidden />
          {t("leadSheetsEditorEditDetails")}
        </Button>
      </div>

      <div className="mt-3 flex items-start gap-2 border-t border-[#efe7de] pt-3">
        <TagIcon className="mt-1.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <TemplateAssignedIndustryPills
          categoryIds={categoryIds}
          categories={categories}
          size="summary"
        />
      </div>
    </section>
  )
}
