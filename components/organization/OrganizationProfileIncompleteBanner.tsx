"use client"

import Link from "next/link"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { cn } from "cn"

type OrganizationProfileIncompleteBannerProps = {
  variant: "admin" | "client"
  organizationSlug?: string
  className?: string
}

export function OrganizationProfileIncompleteBanner({
  variant,
  organizationSlug,
  className,
}: OrganizationProfileIncompleteBannerProps) {
  const { t } = useLanguage()

  const href =
    variant === "admin" && organizationSlug
      ? adminClientSettingsSectionPath(organizationSlug, "company")
      : "/indstillinger#company-profile"

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950",
        className
      )}
    >
      <p className="font-medium">{t("clientProfileIncompleteTitle")}</p>
      <p className="mt-1 text-amber-900/90">{t("clientProfileIncompleteDescription")}</p>
      <Link
        href={href}
        className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-2 hover:underline"
      >
        {variant === "admin" ? t("clientProfileIncompleteAdminCta") : t("clientProfileIncompleteClientCta")}
      </Link>
    </div>
  )
}
