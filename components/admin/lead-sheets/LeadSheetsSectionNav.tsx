"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

/** Switches between the two lead sheet admin pages: templates and the field library. */
export function LeadSheetsSectionNav() {
  const { t } = useLanguage()
  const pathname = usePathname() ?? ""
  const onFields = pathname.startsWith("/admin/lead-sheets/fields")

  const items = [
    { href: "/admin/lead-sheets", label: t("leadTemplatesNav"), active: !onFields },
    { href: "/admin/lead-sheets/fields", label: t("leadFieldsNav"), active: onFields },
  ]

  return (
    <nav className="inline-flex w-fit gap-1 rounded-xl border border-[#e8e0d8] bg-white p-1 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            item.active
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
