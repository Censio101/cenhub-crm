"use client"

import Link from "next/link"
import { Building2Icon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { isOrganizationProfileComplete } from "@/lib/organization-profile"
import { cn } from "cn"

export function AdminClientCompanySummaryCard() {
  const { t } = useLanguage()
  const { slug, organization } = useAdminClient()
  if (!organization) return null

  const complete = isOrganizationProfileComplete(organization)
  const contact = organization.primary_contact_name?.trim()
  const email = organization.primary_contact_email?.trim()

  return (
    <section className={cn(adminSectionCardClass, "mb-4 px-5 py-5 sm:mb-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("clientNavCompany")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {complete ? t("clientProfileSummaryComplete") : t("clientProfileSummaryIncomplete")}
            </p>
            {contact || email ? (
              <p className="mt-2 text-sm text-foreground">
                {[contact, email].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
        <Link
          href={adminClientSettingsSectionPath(slug, "company")}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t("clientProfileSummaryEdit")}
        </Link>
      </div>
    </section>
  )
}
