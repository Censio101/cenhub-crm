"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AdminClientHvidbjergPartnerSection } from "@/components/admin/AdminClientHvidbjergPartnerSection"
import { useAdminClient } from "@/components/admin/AdminClientContext"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import {
  CompanyProfileFields,
  companyProfileFormValuesFromProfile,
  type CompanyProfileFormValues,
} from "@/components/organization/CompanyProfileFields"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { OrganizationLogoUpload } from "@/components/organization/OrganizationLogoUpload"
import { Button } from "@/components/ui/button"
import { organizationProfileFromRow } from "@/lib/organization-profile"
import { resolveOrganizationLogoUrl } from "@/lib/organization-logo"
import { cn } from "cn"

export function AdminClientCompanyProfilePanel() {
  const router = useRouter()
  const { t } = useLanguage()
  const { slug, organization, reload } = useAdminClient()
  const [values, setValues] = useState<CompanyProfileFormValues | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setLogoUrl(resolveOrganizationLogoUrl(organization?.logo_url ?? null))
  }, [organization?.logo_url])

  useEffect(() => {
    if (!organization) return
    const profile = organizationProfileFromRow(organization)
    setValues(companyProfileFormValuesFromProfile(profile, organization.slug))
  }, [organization])

  if (!organization || !values) return null

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch(`/api/admin/organizations/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = (await response.json()) as {
        error?: string
        message?: string
        slug?: string
        organization?: typeof organization
      }
      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? t("clientProfileSaveError"))
      }
      setSaved(true)
      await reload({ silent: true })
      if (data.slug && data.slug !== slug) {
        router.replace(`/admin/clients/${data.slug}/company`)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("clientProfileSaveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("clientNavCompany")}
      </h1>

      <div className={cn(adminSectionCardClass, "p-5 sm:p-6")}>
        <div className="border-b border-[#e8e0d8] pb-6">
          <h2 className="text-base font-semibold text-foreground">{t("clientBrandingTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("clientBrandingDescription")}</p>
          <div className="mt-4">
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
        </div>

        <div className="pt-6">
        <CompanyProfileFields
          values={values}
          onChange={setValues}
          showSlug
          idPrefix="admin-company"
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? t("clientProfileSaving") : t("clientProfileSave")}
          </Button>
          {saved ? (
            <p className="text-sm text-success-foreground">{t("clientProfileSaved")}</p>
          ) : null}
          {error ? (
            <p className="text-sm text-danger-foreground" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("clientProfileContactEmailHint")}</p>
        </div>
      </div>
    </div>
  )
}
