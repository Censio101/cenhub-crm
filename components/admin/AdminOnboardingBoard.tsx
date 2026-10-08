"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon, UserPlusIcon } from "lucide-react"

import { OnboardingStatusBadge } from "@/components/admin/onboarding-status-badge"
import { PortalLoginDetails, type PortalLogin } from "@/components/admin/PortalAccessFields"
import { ShareSignupLinkButton } from "@/components/admin/ShareSignupLinkButton"
import { adminOutlineButtonClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { OnboardingApplicationForm } from "@/components/onboarding/OnboardingApplicationForm"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OnboardingApplicationStatusCounts } from "@/lib/db/onboarding-applications-repository"
import type { OnboardingApplicationRow, OnboardingApplicationStatus } from "@/lib/db/types"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"
import { useAsyncEffect } from "@/lib/react/use-async-effect"

const FILTERS: Array<OnboardingApplicationStatus | "all"> = [
  "pending",
  "approved",
  "rejected",
  "all",
]

function OnboardingQueueSkeleton() {
  return (
    <Table containerClassName="pb-2">
      <TableHeader>
        <TableRow className="h-11 hover:bg-transparent">
          <TableHead className="h-11 w-[28%] pl-6" />
          <TableHead className="h-11 w-[22%]" />
          <TableHead className="h-11 w-[32%]" />
          <TableHead className="h-11 w-[18%]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow key={index} className="h-11 hover:bg-transparent">
            <TableCell className="pl-6">
              <div className="h-3.5 w-28 animate-pulse rounded-md bg-[#efe8e0]" />
            </TableCell>
            <TableCell>
              <div className="h-3.5 w-24 animate-pulse rounded-md bg-[#efe8e0]" />
            </TableCell>
            <TableCell>
              <div className="h-3.5 w-36 animate-pulse rounded-md bg-[#efe8e0]" />
            </TableCell>
            <TableCell>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#efe8e0]" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function AdminOnboardingBoard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const showingCreate = searchParams.get("tab") === "opret"

  const [filter, setFilter] = useState<OnboardingApplicationStatus | "all">("pending")
  const [applications, setApplications] = useState<OnboardingApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueNotice, setQueueNotice] = useState<string | null>(null)
  const [createdLogin, setCreatedLogin] = useState<PortalLogin | null>(null)
  const [counts, setCounts] = useState<OnboardingApplicationStatusCounts | null>(null)
  const loadGeneration = useRef(0)

  function filterTabLabel(value: OnboardingApplicationStatus | "all"): string {
    const base = t(
      value === "all"
        ? "filterAll"
        : value === "pending"
          ? "onboardingStatusPending"
          : value === "approved"
            ? "onboardingStatusApproved"
            : "onboardingStatusRejected"
    )
    if (counts === null) return base
    return `${base} (${counts[value]})`
  }

  const showCreateForm = useCallback(() => {
    setCreatedLogin(null)
    router.replace("/admin/onboarding?tab=opret", { scroll: false })
  }, [router])

  const showApplications = useCallback(() => {
    router.replace("/admin/onboarding", { scroll: false })
  }, [router])

  const load = useCallback(
    async (
      status: OnboardingApplicationStatus | "all",
      options?: { silent?: boolean }
    ) => {
      const silent = options?.silent ?? false
      const generation = ++loadGeneration.current
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const query = status === "all" ? "" : `?status=${status}`
        const response = await fetch(`/api/admin/onboarding/applications${query}`, {
          cache: "no-store",
        })
        if (generation !== loadGeneration.current) return
        if (!response.ok) throw new Error(t("onboardingLoadError"))
        const data = (await response.json()) as {
          applications: OnboardingApplicationRow[]
          counts?: OnboardingApplicationStatusCounts
        }
        setApplications(data.applications)
        if (data.counts) setCounts(data.counts)
      } catch (loadError) {
        if (generation !== loadGeneration.current) return
        if (!silent) {
          setApplications([])
          setError(loadError instanceof Error ? loadError.message : t("onboardingLoadError"))
        }
      } finally {
        if (!silent && generation === loadGeneration.current) setLoading(false)
      }
    },
    [t]
  )

  useAsyncEffect(() => {
    if (!showingCreate) void load(filter)
  }, [filter, load, showingCreate])

  useEffect(() => {
    if (showingCreate) return

    const pollMs = 5_000
    const intervalId = window.setInterval(() => {
      void load(filter, { silent: true })
    }, pollMs)

    function onFocus() {
      void load(filter, { silent: true })
    }
    window.addEventListener("focus", onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", onFocus)
    }
  }, [filter, load, showingCreate])

  function selectFilter(value: OnboardingApplicationStatus | "all") {
    if (value === filter) return
    setFilter(value)
    setApplications([])
    setLoading(true)
    setError(null)
  }

  const listActions = (
    <div className="flex flex-wrap items-center gap-2">
      <ShareSignupLinkButton className={cn("h-10 shrink-0 gap-2 px-4", adminOutlineButtonClass)} />
      <Button type="button" className="h-10 shrink-0 gap-2 px-4" onClick={showCreateForm}>
        <UserPlusIcon className="size-4" aria-hidden="true" />
        {t("onboardingCreateClient")}
      </Button>
    </div>
  )

  return (
    <div className={cn("admin-ui grid gap-6", outfit.className)}>
      {showingCreate ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <Link
            href="/admin/onboarding"
            className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-[#d3c3b2] bg-white px-4 text-[13px] font-semibold leading-none text-foreground shadow-[0_1px_2px_rgba(26,18,8,0.06)] transition-colors hover:border-primary/45 hover:text-primary hover:shadow-[0_2px_6px_rgba(228,102,12,0.1)]"
          >
            <ChevronLeftIcon className="size-4 shrink-0 text-primary/80" aria-hidden="true" />
            <span className="leading-none">{t("onboardingBackToAllApplications")}</span>
          </Link>

          <header>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("onboardingCreateClient")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("onboardingAdminCreateDescription")}
            </p>
          </header>

          <section className={cn(adminSectionCardClass, "px-6 py-8 sm:px-8")}>
            <OnboardingApplicationForm
              mode="admin"
              onSubmitted={(result) => {
                setCreatedLogin(result.login ?? null)
                setQueueNotice(
                  result.organizationSlug
                    ? t(
                        result.accessMethod === "password"
                          ? "onboardingApprovedPasswordNotice"
                          : "onboardingApprovedNotice",
                        { slug: result.organizationSlug }
                      )
                    : t("onboardingAdminSubmitSuccess")
                )
                showApplications()
                void load(filter, { silent: true })
              }}
            />
          </section>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{t("onboardingAdminTitle")}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {t("onboardingAdminDescription")}
              </p>
            </div>
            {listActions}
          </div>

        <div className="grid w-full min-w-0 gap-4">
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => selectFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-sm font-medium leading-none transition-colors",
                  filter === value
                    ? "bg-primary text-white"
                    : "bg-[#faf8f6] text-foreground hover:bg-[#efe8e0]"
                )}
              >
                {filterTabLabel(value)}
              </button>
            ))}
          </div>

          <FormNoticeStack
            error={error}
            success={queueNotice}
            onDismissError={() => setError(null)}
            onDismissSuccess={() => setQueueNotice(null)}
            dismissLabel={t("noticeDismiss")}
            size={adminFormNoticeDefaults.size}
            errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
            successAutoDismissMs={adminFormNoticeDefaults.queueSuccessAutoDismissMs}
          />

          {createdLogin ? (
            <PortalLoginDetails login={createdLogin} onDone={() => setCreatedLogin(null)} />
          ) : null}

          {!loading && applications.length > 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("onboardingQueueReviewHint")}</p>
          ) : null}

          <section className={cn(adminSectionCardClass, "overflow-hidden")} aria-busy={loading}>
            {loading ? (
              <>
                <p className="sr-only">{t("loading")}</p>
                <OnboardingQueueSkeleton />
              </>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">{t("onboardingQueueEmpty")}</p>
                <Button type="button" className="h-10 gap-2" onClick={showCreateForm}>
                  <UserPlusIcon className="size-4" aria-hidden="true" />
                  {t("onboardingCreateClient")}
                </Button>
              </div>
            ) : (
              <Table containerClassName="pb-2">
                <TableHeader>
                  <TableRow className="h-11 hover:bg-transparent">
                    <TableHead className="h-11 pl-6">{t("onboardingColumnCompany")}</TableHead>
                    <TableHead className="h-11">{t("onboardingColumnContact")}</TableHead>
                    <TableHead className="h-11">{t("onboardingColumnEmail")}</TableHead>
                    <TableHead className="h-11">{t("onboardingColumnStatus")}</TableHead>
                    <TableHead className="h-11 w-10 pr-4" aria-hidden="true" />
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_[data-slot=table-cell]]:h-12 [&_[data-slot=table-cell]]:max-h-12 [&_[data-slot=table-cell]]:py-0 [&_[data-slot=table-row]]:h-12">
                  {applications.map((application) => (
                    <TableRow
                      key={application.id}
                      className="group h-12 cursor-pointer transition-colors hover:bg-[#faf8f6] focus-within:bg-[#faf8f6]"
                      tabIndex={0}
                      role="link"
                      onClick={() => {
                        router.push(`/admin/onboarding/${application.id}`)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          router.push(`/admin/onboarding/${application.id}`)
                        }
                      }}
                    >
                      <TableCell className="max-w-[12rem] truncate pl-6 font-medium text-foreground group-hover:text-primary">
                        {application.company_name}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate">
                        {application.contact_full_name}
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                        {application.contact_email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <OnboardingStatusBadge status={application.status} />
                      </TableCell>
                      <TableCell className="w-10 pr-4 text-muted-foreground">
                        <ChevronRightIcon
                          className="size-4 opacity-40 transition-opacity group-hover:opacity-100 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
        </>
      )}
    </div>
  )
}
