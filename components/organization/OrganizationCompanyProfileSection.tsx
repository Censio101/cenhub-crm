"use client"

import { useEffect, useState } from "react"

import {
  CompanyProfileFields,
  companyProfileFormValuesFromProfile,
  type CompanyProfileFormValues,
} from "@/components/organization/CompanyProfileFields"
import { OrganizationLogoUpload } from "@/components/organization/OrganizationLogoUpload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

export function OrganizationCompanyProfileSection() {
  const { t } = useLanguage()
  const { organization, role, reload: reloadOrg } = useActiveOrganization()
  const canEdit = role === "client_admin" || role === "censio_admin"
  const [values, setValues] = useState<CompanyProfileFormValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/organization/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.profile) return
        setValues(
          companyProfileFormValuesFromProfile(data.profile, data.slug ?? "")
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    if (!values) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch("/api/organization/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = (await response.json()) as { message?: string; error?: string }
      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? t("clientProfileSaveError"))
      }
      setSaved(true)
      await reloadOrg()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("clientProfileSaveError"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>{t("clientProfileWorkspaceTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (!values) return null

  return (
    <Card className="dashboard-card" id="company-profile">
      <CardHeader>
        <CardTitle>{t("clientProfileWorkspaceTitle")}</CardTitle>
        <CardDescription>{t("clientProfileWorkspaceDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {organization ? (
          <div className="border-b border-border pb-6">
            <OrganizationLogoUpload
              logoUrl={organization.logoUrl}
              canEdit={canEdit}
              uploadUrl="/api/organization/logo"
              label={t("clientLogoLabel")}
              description={t("clientLogoDescription")}
              changeLabel={t("clientLogoChange")}
              removeLabel={t("clientLogoRemove")}
              uploadingLabel={t("clientLogoUploading")}
              onLogoChange={() => {
                void reloadOrg()
              }}
            />
          </div>
        ) : null}
        <CompanyProfileFields
          values={values}
          onChange={setValues}
          readOnly={!canEdit}
          fieldClass={fieldClass}
          idPrefix="workspace-company"
        />
        {canEdit ? (
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
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground">{t("clientProfileContactEmailHint")}</p>
      </CardContent>
    </Card>
  )
}
