"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

export function AdminNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const links = [
    { href: "/admin", label: t("navClients"), exact: true },
    { href: "/admin/meta", label: t("navMetaClients"), exact: false },
    { href: "/admin/settings", label: t("navSettings"), exact: false },
  ] as const

  return (
    <nav className="flex flex-wrap gap-2" aria-label={t("navAria")}>
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
