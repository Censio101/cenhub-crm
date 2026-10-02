"use client"

import { useEffect, useState } from "react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { OrganizationLogoUpload } from "@/components/organization/OrganizationLogoUpload"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { resolveOrganizationLogoUrl } from "@/lib/organization-logo"
import { cn } from "cn"

export function AdminClientBrandingPanel() {
  const { t } = useLanguage()
  const { slug, organization, reload } = useAdminClient()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setLogoUrl(resolveOrganizationLogoUrl(organization?.logo_url ?? null))
  }, [organization?.logo_url])

  if (!organization) return null

  return (
    <section className={cn(adminSectionCardClass, "mb-4 px-5 py-5 sm:mb-5")}>
      <h2 className="text-base font-semibold text-foreground">{t("clientBrandingTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("clientBrandingDescription")}</p>
      <div className="mt-5">
        <OrganizationLogoUpload
          logoUrl={logoUrl}
          canEdit
          uploadUrl={`/api/admin/organizations/${slug}/logo`}
          label={t("clientLogoLabel")}
          description={t("clientLogoDescription")}
          changeLabel={t("clientLogoChange")}
          removeLabel={t("clientLogoRemove")}
          uploadingLabel={t("clientLogoUploading")}
          onLogoChange={(next) => {
            setLogoUrl(next)
            void reload({ silent: true })
          }}
        />
      </div>
    </section>
  )
}
