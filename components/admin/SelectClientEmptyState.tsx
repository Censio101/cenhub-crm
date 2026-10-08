"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Loader2Icon, SearchIcon } from "lucide-react"

import { useAdminClientAutoSelect } from "@/components/admin/AdminClientAutoSelectContext"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAdminOrganizationList } from "@/hooks/useAdminOrganizationList"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import { Button } from "@/components/ui/button"
import { filterPickerOrganizations } from "@/lib/admin/client-picker"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { recordRecentClientSlug } from "@/lib/admin/client-picker-recents"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

const cardClass =
  "admin-ui mx-auto flex w-full max-w-lg flex-col rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]"

export function SelectClientEmptyState() {
  const { t } = useLanguage()
  const { autoSelecting } = useAdminClientAutoSelect()
  const {
    needsClientSelection,
    organization,
    role,
    loading: sessionLoading,
    setActiveOrganization,
  } = useActiveOrganization()
  const {
    pickerOrganizations,
    loading: listLoading,
    error: listError,
    reload: reloadList,
  } = useAdminOrganizationList()
  const [openingSlug, setOpeningSlug] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const visible = useMemo(
    () => filterPickerOrganizations(pickerOrganizations, query),
    [pickerOrganizations, query]
  )

  const showOpeningSpinner =
    needsClientSelection && (sessionLoading || listLoading || autoSelecting || openingSlug !== null)

  let uiBranch: "spinner" | "loadError" | "picker" | "emptyNoClients" = "emptyNoClients"
  if (showOpeningSpinner) uiBranch = "spinner"
  else if (listError && pickerOrganizations.length === 0) uiBranch = "loadError"
  else if (needsClientSelection && pickerOrganizations.length > 0) uiBranch = "picker"

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7295/ingest/3efac2fa-9b4f-402f-9f78-550675d5de3e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "138f58" },
      body: JSON.stringify({
        sessionId: "138f58",
        hypothesisId: "H3",
        location: "SelectClientEmptyState.tsx",
        message: "render_state",
        data: {
          uiBranch,
          sessionNeedsClient: needsClientSelection,
          orgSlug: organization?.slug ?? null,
          role,
          pickerCount: pickerOrganizations.length,
          listError,
          listLoading,
          sessionLoading,
          autoSelecting,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [
    uiBranch,
    needsClientSelection,
    organization?.slug,
    role,
    pickerOrganizations.length,
    listError,
    listLoading,
    sessionLoading,
    autoSelecting,
  ])

  async function handleOpen(slug: string) {
    if (openingSlug) return
    setOpeningSlug(slug)
    try {
      const ok = await setActiveOrganization(slug)
      if (ok) recordRecentClientSlug(slug)
    } finally {
      setOpeningSlug(null)
    }
  }

  if (showOpeningSpinner) {
    return (
      <div
        className={cn(cardClass, outfit.className, "items-center gap-4 px-8 py-12 text-center")}
      >
        <Loader2Icon className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{t("adminOpeningClientWorkspace")}</p>
      </div>
    )
  }

  // The list could not be loaded: say so and offer a retry — never claim "no clients".
  if (listError && pickerOrganizations.length === 0) {
    return (
      <div
        className={cn(cardClass, outfit.className, "items-center gap-4 px-8 py-12 text-center")}
      >
        <p className="text-sm text-muted-foreground" role="alert">
          {t("clientPickerLoadError")}
        </p>
        <Button
          type="button"
          className="h-10"
          onClick={() => {
            void reloadList()
          }}
        >
          {t("dashboardRetry")}
        </Button>
      </div>
    )
  }

  if (needsClientSelection && pickerOrganizations.length > 0) {
    return (
      <div className={cn(cardClass, outfit.className, "gap-4 px-6 py-8 sm:px-8")}>
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">{t("clientPickerTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("clientPickerDescription")}</p>
        </div>
        <label className="relative block">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchClients")}
            aria-label={t("searchClients")}
            className="h-10 w-full rounded-[10px] border border-border bg-white pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"
          />
        </label>
        <ul className="max-h-[22rem] divide-y divide-[#e8e0d8] overflow-y-auto rounded-xl border border-[#e8e0d8]">
          {visible.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t("noMatchingClients")}
            </li>
          ) : (
            visible.map((org) => (
              <li
                key={org.slug}
                className="flex items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {formatClientDisplayName(org.name)}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{org.slug}</p>
                </div>
                <Button
                  type="button"
                  className="h-9 shrink-0"
                  disabled={openingSlug !== null}
                  onClick={() => {
                    void handleOpen(org.slug)
                  }}
                >
                  {t("clientPickerOpenShort")}
                </Button>
              </li>
            ))
          )}
        </ul>
        <p className="text-center text-xs text-muted-foreground">
          {t("clientsCount", { count: String(pickerOrganizations.length) })}
        </p>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/admin/clients" />}
          className="h-10"
        >
          {t("clientSwitcherFullList")}
        </Button>
      </div>
    )
  }

  // Parent should only mount this when the session needs a client; avoid a false "no clients" message.
  if (!needsClientSelection) {
    return null
  }

  return (
    <div className={cn(cardClass, outfit.className, "items-center gap-4 px-8 py-12 text-center")}>
      <h2 className="text-lg font-medium text-foreground">{t("clientPickerEmptyListTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("clientPickerEmptyListHint")}</p>
      <Button
        nativeButton={false}
        render={<Link href="/admin/clients" />}
        className="mt-2 h-10"
      >
        {t("navClientSettings")}
      </Button>
    </div>
  )
}
