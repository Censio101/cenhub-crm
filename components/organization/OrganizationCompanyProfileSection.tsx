"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"

import {
  CompanyProfileFields,
  companyProfileFormValuesFromProfile,
  type CompanyProfileFormValues,
} from "@/components/organization/CompanyProfileFields"
import { OrganizationCompanyProfileSkeleton } from "@/components/organization/OrganizationCompanyProfileSkeleton"
import { OrganizationLogoUpload } from "@/components/organization/OrganizationLogoUpload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { cn } from "cn"

const fieldClass =
  "h-11 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/25 focus:border-primary/40 read-only:cursor-default read-only:bg-[#faf8f6] disabled:cursor-not-allowed disabled:bg-[#faf8f6] disabled:text-foreground"

function CompanyProfileFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("grid gap-4 border-b border-border pb-8 last:border-b-0 last:pb-0", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function OrganizationCompanyProfileSection({
  omitCardHeader = false,
  organizationSlug,
}: {
  omitCardHeader?: boolean
  organizationSlug?: string
}) {
  const { t } = useLanguage()
  const { organization, role, reload: reloadOrg } = useActiveOrganization()
  const canEdit = role === "client_admin" || role === "censio_admin"
  const [values, setValues] = useState<CompanyProfileFormValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const slug = organizationSlug ?? organization?.slug

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/organization/profile", {
        cache: "no-store",
        signal,
      })
      const data = (await response.json()) as {
        profile?: Parameters<typeof companyProfileFormValuesFromProfile>[0]
        slug?: string
        message?: string
        error?: string
      }
      if (!response.ok || !data.profile) {
        throw new Error(data.message ?? data.error ?? t("errorLoadClient"))
      }
      setValues(companyProfileFormValuesFromProfile(data.profile, data.slug ?? slug ?? ""))
    } catch (caught) {
      if (signal?.aborted) return
      setValues(null)
      setLoadError(
        caught instanceof Error ? caught.message : t("errorLoadClient")
      )
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [slug, t])

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    void loadProfile(controller.signal)
    return () => controller.abort()
  }, [slug, loadProfile])

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
    return <OrganizationCompanyProfileSkeleton omitCardHeader={omitCardHeader} />
  }

  if (loadError || !values) {
    return (
      <Card className="dashboard-card w-full">
        <CardContent className={cn("py-8", omitCardHeader && "pt-8")}>
          <p className="text-sm text-destructive" role="alert">
            {loadError ?? t("errorLoadClient")}
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void loadProfile()}>
            {t("dashboardRetry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const fieldProps = {
    values,
    onChange: (next: CompanyProfileFormValues) => {
      setValues(next)
      setSaved(false)
    },
    readOnly: !canEdit,
    fieldClass,
    idPrefix: "workspace-company",
    showSectionHeadings: false,
  } as const

  if (omitCardHeader) {
    return (
      <Card className="dashboard-card overflow-hidden">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canEdit || saving) return
            void handleSave()
          }}
        >
          <div className="grid gap-8 px-6 py-6 sm:px-8 sm:py-8">
            {organization ? (
              <CompanyProfileFormSection
                title={t("clientLogoLabel")}
                description={t("clientProfileLogoCardDescription")}
              >
                <OrganizationLogoUpload
                  variant="panel"
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
              </CompanyProfileFormSection>
            ) : null}

            <CompanyProfileFormSection
              title={t("onboardingSectionCompany")}
              description={t("clientProfileCompanyCardDescription")}
            >
              <CompanyProfileFields {...fieldProps} sections={["company"]} />
            </CompanyProfileFormSection>

            <CompanyProfileFormSection
              title={t("onboardingSectionContact")}
              description={t("clientProfileContactEmailHint")}
            >
              <CompanyProfileFields {...fieldProps} sections={["contact"]} />
            </CompanyProfileFormSection>

            <CompanyProfileFormSection
              title={t("onboardingSectionAddress")}
              description={t("clientProfileAddressCardDescription")}
              className="border-b-0 pb-0"
            >
              <CompanyProfileFields {...fieldProps} sections={["address"]} />
            </CompanyProfileFormSection>
          </div>

          <div className="border-t border-border bg-[#faf8f6] px-6 py-5 sm:px-8">
            {canEdit ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button type="submit" className="h-11 w-full rounded-[5px] px-5 sm:w-auto" disabled={saving}>
                  {saving ? t("clientProfileSaving") : t("clientProfileSave")}
                </Button>
                {saved ? (
                  <p className="text-sm text-success-foreground" role="status">
                    {t("clientProfileSaved")}
                  </p>
                ) : null}
                {error ? (
                  <p className="text-sm text-danger-foreground" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">{t("clientProfileContactEmailHint")}</p>
            )}
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card className="dashboard-card w-full" id="company-profile">
      <CardHeader>
        <CardTitle>{t("clientProfileWorkspaceTitle")}</CardTitle>
        <CardDescription>{t("clientProfileWorkspaceDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 sm:pt-8">
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
          <div className="mt-2 flex flex-wrap items-center gap-3">
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
        <p className="text-xs text-muted-foreground">{t("clientProfileContactEmailHint")}</p>
      </CardContent>
    </Card>
  )
}
