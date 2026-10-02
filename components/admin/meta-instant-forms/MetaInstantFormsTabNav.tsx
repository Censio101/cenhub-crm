"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { MetaInstantFormsTab } from "@/components/admin/meta-instant-forms/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

const TABS: MetaInstantFormsTab[] = ["overview", "forms", "leads"]

type Props = {
  active: MetaInstantFormsTab
  onChange: (tab: MetaInstantFormsTab) => void
}

export function MetaInstantFormsTabNav({ active, onChange }: Props) {
  const { t } = useLanguage()

  const label = (tab: MetaInstantFormsTab) => {
    switch (tab) {
      case "overview":
        return t("metaInstantFormsTabOverview")
      case "forms":
        return t("metaInstantFormsTabForms")
      case "leads":
        return t("metaInstantFormsTabLeadsCheck")
    }
  }

  return (
    <nav
      className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-[#e8e0d8] bg-white p-1 shadow-sm"
      aria-label={t("metaInstantFormsTitle")}
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            active === tab
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-current={active === tab ? "page" : undefined}
          onClick={() => onChange(tab)}
        >
          {label(tab)}
        </button>
      ))}
    </nav>
  )
}

export function useMetaInstantFormsTab(): [
  MetaInstantFormsTab,
  (tab: MetaInstantFormsTab) => void,
] {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const raw = searchParams.get("tab")
  const active: MetaInstantFormsTab =
    raw === "overview" ? "overview" : raw === "leads" ? "leads" : "forms"

  const setTab = (tab: MetaInstantFormsTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "forms") params.delete("tab")
    else params.set("tab", tab)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return [active, setTab]
}
