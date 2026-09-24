"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CheckIcon, ChevronLeftIcon, ExternalLinkIcon, Undo2Icon } from "lucide-react"

import {
  adminFieldClass,
  adminOutlineButtonClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import type { MetaPartnerAccountSelection } from "@/components/admin/MetaPartnerAccountPicker"
import {
  MetaPartnerLinkPanel,
  type LinkedMetaDisplay,
} from "@/components/admin/MetaPartnerLinkPanel"
import { OnboardingStatusBadge } from "@/components/admin/onboarding-status-badge"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import type { OnboardingApplicationRow } from "@/lib/db/types"
import { outfit } from "@/lib/fonts/app-fonts"
import { displayOnboardingPhone } from "@/lib/onboarding/phone"
import { cn } from "cn"

type LinkedOrganization = {
  id: string
  slug: string
  name: string
}

function ReviewSkeleton() {
  return (
    <div className={cn(adminSectionCardClass, "h-48 animate-pulse bg-[#faf8f6]/80")} />
  )
}

export function AdminOnboardingReview({ applicationId }: { applicationId: string }) {
  const { t } = useLanguage()
  const [application, setApplication] = useState<OnboardingApplicationRow | null>(null)
  const [organization, setOrganization] = useState<LinkedOrganization | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [slugOverride, setSlugOverride] = useState("")
  const [seedDemo, setSeedDemo] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | "revert" | null>(null)
  const busy = busyAction !== null
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applicationMeta, setApplicationMeta] = useState<{
    metaAdAccountId: string
    partnerAccountName: string
    metaPageId: string
    enabled: boolean
    needsSetup: boolean
    metaSyncStatus: string
    metaSyncError: string | null
  } | null>(null)
  const [pendingMetaSelection, setPendingMetaSelection] =
    useState<MetaPartnerAccountSelection>(null)
  const [linkedMetaDraft, setLinkedMetaDraft] = useState<MetaPartnerAccountSelection>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMissing(false)
    try {
      const response = await fetch(`/api/admin/onboarding/applications/${applicationId}`, {
        cache: "no-store",
      })
      if (response.status === 404) {
        setMissing(true)
        setApplication(null)
        setOrganization(null)
        return
      }
      if (!response.ok) throw new Error(t("onboardingLoadError"))
      const data = (await response.json()) as {
        application: OnboardingApplicationRow
        organization: LinkedOrganization | null
        meta: {
          metaAdAccountId: string
          partnerAccountName: string
          metaPageId: string
          enabled: boolean
          needsSetup: boolean
          metaSyncStatus: string
          metaSyncError: string | null
        } | null
      }
      setApplication(data.application)
      setOrganization(data.organization)
      setApplicationMeta(data.meta)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("onboardingLoadError"))
    } finally {
      setLoading(false)
    }
  }, [applicationId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function handleApprove() {
    if (!application) return
    setBusyAction("approve")
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/admin/onboarding/applications/${application.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slugOverride: slugOverride.trim() || undefined,
            seedDemo,
            demoMode: seedDemo,
            metaAdAccountId: pendingMetaSelection?.metaAdAccountId,
            metaAccountName: pendingMetaSelection?.accountName,
          }),
        }
      )
      const data = (await response.json()) as {
        error?: string
        organization?: LinkedOrganization
        meta?: { linked: boolean; error?: string } | { linked: true } | null
      }
      if (!response.ok) throw new Error(data.error ?? t("onboardingApproveError"))
      if (data.organization) setOrganization(data.organization)
      setNotice(t("onboardingApprovedNotice", { slug: data.organization?.slug ?? "" }))
      if (data.meta && "linked" in data.meta && data.meta.linked === false && data.meta.error) {
        setError(`${t("onboardingMetaApproveLinkFailed")} ${data.meta.error}`)
      }
      setPendingMetaSelection(null)
      await load()
    } catch (approveError) {
      setError(
        approveError instanceof Error ? approveError.message : t("onboardingApproveError")
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleReject() {
    if (!application) return
    setBusyAction("reject")
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/admin/onboarding/applications/${application.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("onboardingRejectError"))
      setNotice(t("onboardingRejectedNotice"))
      setRejectReason("")
      await load()
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : t("onboardingRejectError"))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRevertRejection() {
    if (!application) return
    setBusyAction("revert")
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/admin/onboarding/applications/${application.id}/reopen`,
        { method: "POST" }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("onboardingRevertRejectionError"))
      setNotice(t("onboardingRevertRejectionNotice"))
      await load()
    } catch (revertError) {
      setError(
        revertError instanceof Error ? revertError.message : t("onboardingRevertRejectionError")
      )
    } finally {
      setBusyAction(null)
    }
  }

  const busyProgressMessage =
    busyAction === "approve"
      ? t("onboardingReviewWorking")
      : busyAction === "revert"
        ? t("onboardingRevertRejectionWorking")
        : busyAction === "reject"
          ? t("onboardingSubmitting")
          : null

  const linkedMetaDisplay: LinkedMetaDisplay =
    applicationMeta?.metaAdAccountId?.trim()
      ? {
          metaAdAccountId: applicationMeta.metaAdAccountId,
          accountName:
            applicationMeta.partnerAccountName?.trim() ||
            applicationMeta.metaAdAccountId,
        }
      : null

  return (
    <div className={cn("admin-ui mx-auto grid w-full max-w-[44rem] gap-5", outfit.className)}>
      <Link
        href="/admin/onboarding"
        className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-[#d3c3b2] bg-white px-4 text-[13px] font-semibold leading-none text-foreground shadow-[0_1px_2px_rgba(26,18,8,0.06)] transition-colors hover:border-primary/45 hover:text-primary hover:shadow-[0_2px_6px_rgba(228,102,12,0.1)]"
      >
        <ChevronLeftIcon className="size-4 shrink-0 text-primary/80" aria-hidden="true" />
        <span className="leading-none">{t("onboardingBackToAllApplications")}</span>
      </Link>

      {loading ? (
        <ReviewSkeleton />
      ) : missing || !application ? (
        <p className="text-sm text-muted-foreground">{t("onboardingReviewMissing")}</p>
      ) : (
        <>
          <header>
            <p className="text-xs font-medium leading-none tracking-[0.16em] text-primary uppercase">
              {t("onboardingDetailTitle")}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                {application.company_name}
              </h1>
              <OnboardingStatusBadge status={application.status} className="h-7 px-3 text-[13px]" />
            </div>
          </header>

          <FormNoticeStack
            progress={busyProgressMessage}
            error={error}
            success={notice}
            onDismissError={() => setError(null)}
            onDismissSuccess={() => setNotice(null)}
            dismissLabel={t("noticeDismiss")}
            size={adminFormNoticeDefaults.size}
            errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
            successAutoDismissMs={adminFormNoticeDefaults.queueSuccessAutoDismissMs}
          />

          <section className={cn(adminSectionCardClass, "overflow-hidden")}>
            <p className="border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3 text-[14px] leading-snug text-muted-foreground">
              {t("onboardingReviewApplicantData")}
            </p>

            <ApplicantSection title={t("onboardingSectionCompany")}>
              <DetailRow label={t("onboardingFieldCompanyName")} value={application.company_name} />
              <DetailRow label={t("onboardingFieldCvr")} value={application.cvr ?? "—"} />
              <DetailRow label={t("onboardingFieldWebsite")} value={application.website_url ?? "—"} />
            </ApplicantSection>

            <ApplicantSection title={t("onboardingSectionContact")}>
              <DetailRow label={t("onboardingFieldFullName")} value={application.contact_full_name} />
              <DetailRow label={t("onboardingFieldEmail")} value={application.contact_email} />
              <DetailRow
                label={t("onboardingFieldPhone")}
                value={displayOnboardingPhone(application.contact_phone)}
              />
            </ApplicantSection>

            <ApplicantSection title={t("onboardingSectionAddress")}>
              <DetailRow label={t("onboardingFieldAddress")} value={application.address} />
              <DetailRow
                label={t("onboardingFieldZip")}
                value={`${application.zip_code} ${application.city}`}
              />
            </ApplicantSection>

            {application.notes ? (
              <ApplicantSection title={t("onboardingFieldNotes")}>
                <DetailRow label={t("onboardingFieldNotes")} value={application.notes} className="sm:col-span-2" />
              </ApplicantSection>
            ) : null}
            {application.rejection_reason ? (
              <div className="border-t border-[#e8e0d8] px-5 py-4">
                <DetailRow
                  label={t("onboardingRejectReason")}
                  value={application.rejection_reason}
                  className="sm:col-span-2"
                />
              </div>
            ) : null}

            {organization ? (
              <div className="grid gap-4 border-t border-[#e8e0d8] px-5 py-4">
                <MetaPartnerLinkPanel
                  mode="linked"
                  organizationSlug={organization.slug}
                  suggestName={application.company_name}
                  linkedAccount={linkedMetaDisplay}
                  draftSelection={linkedMetaDraft}
                  onDraftSelectionChange={setLinkedMetaDraft}
                  disabled={busy}
                  onLinked={() => {
                    void load()
                  }}
                  onLinkSuccess={(message) => {
                    setNotice(message)
                    setError(null)
                  }}
                  onLinkError={(message) => setError(message)}
                />
                <Button
                  nativeButton={false}
                  render={<Link href={`/admin/${organization.slug}/meta`} />}
                  className="h-10 w-fit gap-2 px-4"
                >
                  {t("onboardingOpenClient")}
                  <ExternalLinkIcon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : application.status === "rejected" ? (
              <div className="grid gap-3 border-t border-[#e8e0d8] px-5 py-4">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {t("onboardingRejectedReviewHint")}
                </p>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleRevertRejection()
                  }}
                  className="h-10 w-fit gap-2 px-4"
                >
                  <Undo2Icon className="size-4" aria-hidden="true" />
                  {t("onboardingRevertRejectionButton")}
                </Button>
              </div>
            ) : application.status === "pending" ? (
              <div className="grid gap-3 border-t border-[#e8e0d8] px-5 py-4">
                <MetaPartnerLinkPanel
                  mode="pending"
                  suggestName={application.company_name}
                  linkedAccount={null}
                  draftSelection={pendingMetaSelection}
                  onDraftSelectionChange={setPendingMetaSelection}
                  disabled={busy}
                />
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground/85">
                    {t("onboardingFieldSlugOverride")}
                  </span>
                  <input
                    className={adminFieldClass}
                    value={slugOverride}
                    onChange={(event) => setSlugOverride(event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={seedDemo}
                    onChange={(event) => setSeedDemo(event.target.checked)}
                  />
                  {t("onboardingSeedDemo")}
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void handleApprove()
                    }}
                    className="h-10 gap-2 px-4"
                  >
                    <CheckIcon className="size-4" />
                    {t("onboardingApproveButton")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      void handleReject()
                    }}
                    className={cn("h-10 px-4", adminOutlineButtonClass)}
                  >
                    {t("onboardingRejectButton")}
                  </Button>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground/85">
                    {t("onboardingRejectReason")}
                  </span>
                  <textarea
                    className="min-h-16 rounded-xl border border-[#d3c3b2] bg-white px-3 py-2.5 text-[15px]"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                </label>
              </div>
            ) : (
              <p className="border-t border-[#e8e0d8] px-5 py-4 text-sm text-muted-foreground">
                {t("onboardingLinkedOrgHint")}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ApplicantSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="border-t border-[#e8e0d8] px-5 py-4">
      <h2 className="mb-3 text-[15px] font-semibold text-foreground">{title}</h2>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[13px] font-semibold text-foreground/85">{label}</dt>
      <dd className="mt-1.5 rounded-xl border border-[#d3c3b2] bg-white px-3.5 py-2.5 text-[15px] font-medium leading-snug text-foreground shadow-[0_1px_2px_rgba(26,18,8,0.03)]">
        {value}
      </dd>
    </div>
  )
}
