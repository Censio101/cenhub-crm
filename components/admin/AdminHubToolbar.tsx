"use client"

import type { ReactNode } from "react"
import { SearchIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "cn"

type AdminHubToolbarProps<T extends string> = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  searchAriaLabel?: string
  filter: T
  onFilterChange: (value: T) => void
  filters: readonly T[]
  filterLabels: Record<T, MessageKey>
  countLabel: string
  loading?: boolean
  loadingLabel?: string
  actions?: ReactNode
  filterAriaLabel?: string
}

export function AdminHubToolbar<T extends string>({
  search,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filter,
  onFilterChange,
  filters,
  filterLabels,
  countLabel,
  loading = false,
  loadingLabel,
  actions,
  filterAriaLabel,
}: AdminHubToolbarProps<T>) {
  const { t } = useLanguage()

  return (
    <div className="hub-toolbar-row">
      <div
        className="meta-hub-filters"
        id="client-hub-filters"
        role="tablist"
        aria-label={filterAriaLabel ?? t("filterClients")}
      >
        {filters.map((value) => {
          const isActive = filter === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn("meta-hub-filter", isActive && "is-active")}
              onClick={() => onFilterChange(value)}
            >
              {t(filterLabels[value])}
            </button>
          )
        })}
      </div>

      <span className="hub-count" id="hub-count">
        {loading ? (loadingLabel ?? t("loadingClients")) : countLabel}
      </span>

      <div className="hub-toolbar-trailing">
        <div className="hub-search">
          <SearchIcon className="size-4" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel ?? searchPlaceholder}
            autoComplete="off"
          />
        </div>

        {actions}
      </div>
    </div>
  )
}
