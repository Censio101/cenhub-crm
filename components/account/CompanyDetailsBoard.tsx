"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertCircleIcon,
  BuildingIcon,
  CheckCircle2Icon,
  CheckIcon,
  GlobeIcon,
  Loader2Icon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react"

import { SelectClientEmptyState } from "@/components/admin/SelectClientEmptyState"
import {
  companyProfileFormValuesFromProfile,
  type CompanyProfileFormValues,
} from "@/components/organization/CompanyProfileFields"
import {
  CompanyLogoControls,
  CompanyLogoStage,
  useCompanyLogo,
} from "@/components/organization/CompanyLogoTile"
import { CompanyDetailsPageSkeleton } from "@/components/organization/OrganizationCompanyProfileSkeleton"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { useAutoDismiss } from "@/hooks/useAutoDismiss"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { useAdminClientPickerGate } from "@/hooks/useAdminClientPickerGate"
import { DashboardSkeleton } from "@/components/performance/DashboardStates"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { isOnboardingContactEmailValid } from "@/lib/onboarding/application-input"
import type { OrganizationLogoBackground } from "@/lib/organization-logo"
import {
  onboardingDigitsOnly,
  ONBOARDING_CVR_DIGIT_COUNT,
  ONBOARDING_ZIP_MAX_DIGITS,
} from "@/lib/onboarding/digit-fields"
import {
  formatOnboardingPhoneDisplay,
  isOnboardingPhoneComplete,
  phoneDigitsOnly,
} from "@/lib/onboarding/phone"
import { cn } from "cn"

type CompanyTab = "company" | "contact" | "address"

const fieldClass =
  "h-11 w-full rounded-xl border border-[#e8e0d8] bg-white px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-[#d3c3b2] focus:border-primary/50 focus:ring-2 focus:ring-primary/15 read-only:cursor-default read-only:bg-[#faf8f6] read-only:hover:border-[#e8e0d8] disabled:opacity-60"

function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      )}
    >
      {tone === "success" ? <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </p>
  )
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-7 border-b border-[#efe6dd] pb-5">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-primary">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function missingByTab(values: CompanyProfileFormValues): Record<CompanyTab, number> {
  return {
    company: values.name.trim() ? 0 : 1,
    contact:
      (values.primaryContactName.trim() ? 0 : 1) +
      (isOnboardingContactEmailValid(values.primaryContactEmail) ? 0 : 1) +
      (isOnboardingPhoneComplete(values.primaryContactPhone) ? 0 : 1),
    address:
      (values.address.trim() ? 0 : 1) +
      (values.zipCode.trim() ? 0 : 1) +
      (values.city.trim() ? 0 : 1),
  }
}

const REQUIRED_TOTAL = 7

export function CompanyDetailsBoard() {
  const { t } = useLanguage()
  const { mustPickClient, resolvingActiveClient } = useAdminClientPickerGate()
  const {
    organization,
    role,
    loading: orgLoading,
    reload: reloadOrg,
    patchOrganization,
  } = useActiveOrganization()
  const canEdit = role === "client_admin" || role === "censio_admin"

  const [tab, setTab] = useState<CompanyTab>("company")
  const [values, setValues] = useState<CompanyProfileFormValues | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  const slug = organization?.slug

  const dismissSaveNotice = useCallback(() => setSaveNotice(null), [])
  const dismissLogoError = useCallback(() => setLogoError(null), [])
  useAutoDismiss(saveNotice, dismissSaveNotice)
  useAutoDismiss(logoError, dismissLogoError, 6000)

  // Single source of truth: the session organization. Choices are applied to it optimistically
  // (so the banner chip, swatches and top header all update together) and saved in the background.
  const logoBackground: OrganizationLogoBackground = organization?.logoBackground ?? "white"

  const logoController = useCompanyLogo({
    uploadUrl: "/api/organization/logo",
    background: logoBackground,
    onLogoChange: () => void reloadOrg({ silent: true }),
    onBackgroundChange: (next) => patchOrganization({ logoBackground: next }),
    onError: setLogoError,
  })

  const loadProfile = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setLoadError(null)
      try {
        const response = await fetch("/api/organization/profile", { cache: "no-store", signal })
        const data = (await response.json()) as {
          profile?: Parameters<typeof companyProfileFormValuesFromProfile>[0]
          slug?: string
          message?: string
          error?: string
        }
        if (!response.ok || !data.profile) {
          throw new Error(data.message ?? data.error ?? t("errorLoadClient"))
        }
        const next = companyProfileFormValuesFromProfile(data.profile, data.slug ?? slug ?? "")
        setValues(next)
        setSavedSnapshot(JSON.stringify(next))
      } catch (caught) {
        if (signal?.aborted) return
        setValues(null)
        setLoadError(caught instanceof Error ? caught.message : t("errorLoadClient"))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [slug, t]
  )

  useEffect(() => {
    if (!slug) return
    const controller = new AbortController()
    void loadProfile(controller.signal)
    return () => controller.abort()
  }, [slug, loadProfile])

  const dirty = values !== null && JSON.stringify(values) !== savedSnapshot
  const missing = useMemo(() => (values ? missingByTab(values) : null), [values])
  const missingTotal = missing ? missing.company + missing.contact + missing.address : 0
  const filledTotal = REQUIRED_TOTAL - missingTotal
  const profileComplete = missing !== null && missingTotal === 0

  function update<K extends keyof CompanyProfileFormValues>(key: K, value: CompanyProfileFormValues[K]) {
    if (!canEdit) return
    setValues((current) => (current ? { ...current, [key]: value } : current))
    setSaveNotice(null)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!values || !canEdit || saving) return
    setSaving(true)
    setSaveError(null)
    setSaveNotice(null)
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
      setSavedSnapshot(JSON.stringify(values))
      setSaveNotice(t("clientProfileSaved"))
      await reloadOrg({ silent: true })
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : t("clientProfileSaveError"))
    } finally {
      setSaving(false)
    }
  }

  if (resolvingActiveClient) {
    return <DashboardSkeleton />
  }

  if (mustPickClient) {
    return <SelectClientEmptyState />
  }

  if (orgLoading) {
    return <CompanyDetailsPageSkeleton />
  }

  if (!organization) {
    return <p className="text-sm text-muted-foreground">{t("clientNotFound")}</p>
  }

  if (loading && !values) {
    return <CompanyDetailsPageSkeleton />
  }

  if (loadError || !values) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-[#e8e0d8] bg-white p-8">
        <p className="text-sm text-destructive" role="alert">
          {loadError ?? t("errorLoadClient")}
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void loadProfile()}>
          {t("dashboardRetry")}
        </Button>
      </div>
    )
  }

  const displayName = values.name.trim() || formatClientDisplayName(organization.name)
  const cvrLabel = values.cvr.trim()
  const websiteLabel = values.websiteUrl.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "")

  const tabs: { id: CompanyTab; label: string; icon: typeof UserRoundIcon }[] = [
    { id: "company", label: t("onboardingSectionCompany"), icon: BuildingIcon },
    { id: "contact", label: t("onboardingSectionContact"), icon: UserRoundIcon },
    { id: "address", label: t("onboardingSectionAddress"), icon: MapPinIcon },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white shadow-[0_2px_10px_rgba(26,18,8,0.05)]">
        <div className="relative overflow-hidden bg-[linear-gradient(120deg,#2a1608_0%,#833b08_55%,#e4660c_130%)] px-5 py-5 sm:px-8 sm:py-6">
          <BuildingIcon
            className="pointer-events-none absolute -right-3 -bottom-6 size-32 text-white/[0.08] sm:size-40"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
            <CompanyLogoStage
              logoUrl={organization.logoUrl}
              background={logoBackground}
              canEdit={canEdit}
              controller={logoController}
            />
            <div className="flex flex-row flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-between">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap text-white/90 uppercase ring-1 ring-white/20 sm:px-3 sm:text-[11px] sm:tracking-[0.14em]">
                <BuildingIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t("clientProfileWorkspaceTitle")}</span>
              </span>
              {canEdit ? (
                <CompanyLogoControls
                  hasLogo={Boolean(organization.logoUrl)}
                  background={logoBackground}
                  controller={logoController}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className="px-5 py-5 sm:px-8 sm:py-6">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
              {displayName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {cvrLabel ? (
                <span className="inline-flex items-center rounded-full bg-[#faf8f6] px-2.5 py-1 text-[12px] font-medium text-foreground ring-1 ring-[#e8e0d8]">
                  CVR {cvrLabel}
                </span>
              ) : null}
              {websiteLabel ? (
                <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[#faf8f6] px-2.5 py-1 text-[12px] font-medium text-foreground ring-1 ring-[#e8e0d8]">
                  <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{websiteLabel}</span>
                </span>
              ) : null}
              {profileComplete ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                  {t("companyProfileComplete")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-200">
                  <AlertCircleIcon className="size-3.5" aria-hidden="true" />
                  {t("companyProfileProgress", { done: filledTotal, total: REQUIRED_TOTAL })}
                </span>
              )}
            </div>
          </div>
        </div>
        {logoError ? (
          <div className="px-5 pb-5 sm:px-8">
            <Notice tone="error">{logoError}</Notice>
          </div>
        ) : null}
      </section>

      {/* Settings shell */}
      <form
        onSubmit={(event) => void handleSave(event)}
        className="mt-6 overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white shadow-[0_2px_10px_rgba(26,18,8,0.05)] md:grid md:grid-cols-[14.5rem_minmax(0,1fr)]"
      >
        <nav
          aria-label={t("clientProfileWorkspaceTitle")}
          className={cn(
            "flex gap-1.5 overflow-x-auto border-b border-[#e8e0d8] bg-[#faf8f6] p-2.5",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:flex-col md:overflow-visible md:border-r md:border-b-0 md:p-4"
          )}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors",
                tab === id
                  ? "bg-white text-primary shadow-sm ring-1 ring-[#e8e0d8]"
                  : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", tab === id && "text-primary")} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {missing && missing[id] > 0 ? (
                <span
                  className="size-2 shrink-0 rounded-full bg-amber-500"
                  title={t("companyTabIncomplete")}
                  aria-label={t("companyTabIncomplete")}
                />
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col">
          <div
            key={tab}
            className="flex-1 p-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 sm:p-8"
          >
            {tab === "company" ? (
              <section>
                <PanelHeading
                  title={t("onboardingSectionCompany")}
                  description={t("clientProfileCompanyCardDescription")}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("onboardingFieldCompanyName")} required className="sm:col-span-2">
                    <input
                      className={fieldClass}
                      value={values.name}
                      readOnly={!canEdit}
                      onChange={(event) => update("name", event.target.value)}
                    />
                  </Field>
                  <Field label={t("onboardingFieldCvr")}>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={values.cvr}
                      readOnly={!canEdit}
                      maxLength={ONBOARDING_CVR_DIGIT_COUNT}
                      placeholder={t("onboardingFieldCvrPlaceholder")}
                      onChange={(event) =>
                        update("cvr", onboardingDigitsOnly(event.target.value, ONBOARDING_CVR_DIGIT_COUNT))
                      }
                    />
                  </Field>
                  <Field label={t("onboardingFieldWebsite")}>
                    <input
                      className={fieldClass}
                      value={values.websiteUrl}
                      readOnly={!canEdit}
                      placeholder={t("onboardingFieldWebsitePlaceholder")}
                      onChange={(event) => update("websiteUrl", event.target.value)}
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {tab === "contact" ? (
              <section>
                <PanelHeading
                  title={t("onboardingSectionContact")}
                  description={t("clientProfileContactEmailHint")}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("onboardingFieldFullName")} required className="sm:col-span-2">
                    <input
                      className={fieldClass}
                      value={values.primaryContactName}
                      readOnly={!canEdit}
                      onChange={(event) => update("primaryContactName", event.target.value)}
                    />
                  </Field>
                  <Field label={t("onboardingFieldEmail")} required>
                    <input
                      type="email"
                      className={fieldClass}
                      value={values.primaryContactEmail}
                      readOnly={!canEdit}
                      placeholder={t("onboardingFieldEmailPlaceholder")}
                      onChange={(event) => update("primaryContactEmail", event.target.value)}
                    />
                  </Field>
                  <Field label={t("onboardingFieldPhone")} required>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={values.primaryContactPhone}
                      readOnly={!canEdit}
                      placeholder={t("onboardingFieldPhonePlaceholder")}
                      onChange={(event) =>
                        update(
                          "primaryContactPhone",
                          formatOnboardingPhoneDisplay(phoneDigitsOnly(event.target.value))
                        )
                      }
                    />
                  </Field>
                </div>
              </section>
            ) : null}

            {tab === "address" ? (
              <section>
                <PanelHeading
                  title={t("onboardingSectionAddress")}
                  description={t("clientProfileAddressCardDescription")}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("onboardingFieldAddress")} required className="sm:col-span-2">
                    <input
                      className={fieldClass}
                      value={values.address}
                      readOnly={!canEdit}
                      onChange={(event) => update("address", event.target.value)}
                    />
                  </Field>
                  <Field label={t("onboardingFieldZip")} required>
                    <input
                      className={fieldClass}
                      inputMode="numeric"
                      value={values.zipCode}
                      readOnly={!canEdit}
                      maxLength={ONBOARDING_ZIP_MAX_DIGITS}
                      placeholder={t("onboardingFieldZipPlaceholder")}
                      onChange={(event) =>
                        update("zipCode", onboardingDigitsOnly(event.target.value, ONBOARDING_ZIP_MAX_DIGITS))
                      }
                    />
                  </Field>
                  <Field label={t("onboardingFieldCity")} required>
                    <input
                      className={fieldClass}
                      value={values.city}
                      readOnly={!canEdit}
                      placeholder={t("onboardingFieldCityPlaceholder")}
                      onChange={(event) => update("city", event.target.value)}
                    />
                  </Field>
                </div>
              </section>
            ) : null}
          </div>

          {/* Save bar */}
          <div className="border-t border-[#e8e0d8] bg-[#faf8f6] px-5 py-4 sm:px-8">
            {canEdit ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-5 min-w-0 flex-1 text-[13px]">
                  {saveError ? (
                    <Notice tone="error">{saveError}</Notice>
                  ) : saveNotice ? (
                    <Notice tone="success">{saveNotice}</Notice>
                  ) : dirty ? (
                    <span className="inline-flex items-center gap-2 font-medium text-amber-900">
                      <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
                      {t("companyUnsavedChanges")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("companyAllSaved")}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {dirty && !saving ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 bg-white px-4"
                      onClick={() => {
                        setValues(JSON.parse(savedSnapshot) as CompanyProfileFormValues)
                        setSaveError(null)
                      }}
                    >
                      {t("companyDiscard")}
                    </Button>
                  ) : null}
                  <Button type="submit" className="h-10 gap-2 px-5" disabled={saving || !dirty}>
                    {saving ? (
                      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {saving ? t("clientProfileSaving") : t("clientProfileSave")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {t("companyReadOnlyHint")}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
