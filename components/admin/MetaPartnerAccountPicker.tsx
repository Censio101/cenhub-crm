"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2Icon, SearchIcon } from "lucide-react"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"
import type { PartnerAdAccountPickerRow } from "@/lib/meta/partner-ad-accounts-for-picker"

export type MetaPartnerAccountSelection = {
  metaAdAccountId: string
  accountName: string
} | null

type Props = {
  organizationSlug?: string
  suggestName?: string
  value: MetaPartnerAccountSelection
  onChange: (value: MetaPartnerAccountSelection) => void
  disabled?: boolean
  className?: string
}

export function MetaPartnerAccountPicker({
  organizationSlug,
  suggestName,
  value,
  onChange,
  disabled = false,
  className,
}: Props) {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [accounts, setAccounts] = useState<PartnerAdAccountPickerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set("q", debouncedQuery)
      if (organizationSlug) params.set("forSlug", organizationSlug)
      if (suggestName) params.set("suggestName", suggestName)
      const response = await fetch(
        `/api/admin/meta/partner-ad-accounts?${params.toString()}`,
        { cache: "no-store" }
      )
      if (!response.ok) throw new Error(t("onboardingMetaPartnerFetchError"))
      const data = (await response.json()) as {
        accounts: PartnerAdAccountPickerRow[]
        meta?: { partnerFetchError?: string | null }
      }
      setAccounts(data.accounts ?? [])
      if (data.meta?.partnerFetchError) {
        setFetchError(data.meta.partnerFetchError)
      }
    } catch (loadError) {
      setAccounts([])
      setFetchError(
        loadError instanceof Error ? loadError.message : t("onboardingMetaPartnerFetchError")
      )
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, organizationSlug, suggestName, t])

  useEffect(() => {
    void load()
  }, [load])

  const selectedId = value?.metaAdAccountId ?? null

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 px-3 py-6 text-[13px] text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          {t("loading")}
        </div>
      )
    }
    if (fetchError && accounts.length === 0) {
      return (
        <p className="px-3 py-4 text-[13px] leading-snug text-red-800">{fetchError}</p>
      )
    }
    if (accounts.length === 0) {
      return (
        <p className="px-3 py-4 text-[13px] text-muted-foreground">
          {t("onboardingMetaPickerEmpty")}
        </p>
      )
    }
    return accounts.map((account) => {
      const isSelected = selectedId === account.metaAdAccountId
      const isDisabled =
        disabled || account.linkStatus === "linked_other"
      return (
        <button
          key={account.metaAdAccountId}
          type="button"
          disabled={isDisabled}
          onClick={() => {
            if (isDisabled) return
            onChange({
              metaAdAccountId: account.metaAdAccountId,
              accountName: account.accountName,
            })
          }}
          className={cn(
            "flex w-full flex-col gap-1 border-b border-[#efe8e0] px-3 py-2.5 text-left transition-colors last:border-b-0",
            isSelected ? "bg-[#faf8f6]" : "hover:bg-[#faf8f6]/80",
            isDisabled && "cursor-not-allowed opacity-55"
          )}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-medium text-foreground">
              {account.accountName}
            </span>
            {account.suggested ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t("onboardingMetaSuggested")}
              </span>
            ) : null}
            {account.linkStatus === "linked_here" ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#166FE5] ring-1 ring-blue-200/80">
                {t("onboardingMetaConnectedHere")}
              </span>
            ) : null}
            {account.linkStatus === "linked_other" ? (
              <span className="rounded-full bg-[#faf8f6] px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-[#e8e0d8]">
                {t("onboardingMetaInUseBy", {
                  name: account.linkedOrgName ?? account.linkedSlug ?? "",
                })}
              </span>
            ) : null}
            {account.linkStatus === "unlinked" && !account.suggested ? (
              <span className="text-[10px] font-medium text-muted-foreground">
                {t("onboardingMetaUnlinked")}
              </span>
            ) : null}
          </span>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            act_{account.metaAdAccountId}
            {account.currency ? ` · ${account.currency}` : ""}
          </span>
        </button>
      )
    })
  }, [accounts, disabled, fetchError, loading, onChange, selectedId, t])

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          className={cn(adminFieldClass, "h-10 pl-9 text-sm")}
          placeholder={t("onboardingMetaSearchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
        />
      </div>
      {fetchError && accounts.length > 0 ? (
        <p className="text-[12px] leading-snug text-amber-900">{fetchError}</p>
      ) : null}
      <div
        className="max-h-56 overflow-y-auto rounded-xl border border-[#d3c3b2] bg-white shadow-[0_1px_2px_rgba(26,18,8,0.04)]"
        role="listbox"
        aria-label={t("onboardingMetaLinkTitle")}
      >
        {listContent}
      </div>
    </div>
  )
}
