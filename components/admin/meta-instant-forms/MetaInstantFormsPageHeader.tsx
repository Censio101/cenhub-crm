"use client"

import Link from "next/link"
import { CheckIcon, CircleIcon } from "lucide-react"

import { MetaInstantFormsSetupStepsSkeleton } from "@/components/admin/meta-instant-forms/MetaInstantFormsOverviewSkeleton"
import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"
import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

type Props = {
  slug: string
  formsTabHref: string
  metaConnected: boolean
  formsLoaded: boolean
  hasEnabledForm: boolean
  webhooksOk: boolean
  loading?: boolean
}

export function MetaInstantFormsPageHeader({
  slug,
  formsTabHref,
  metaConnected,
  formsLoaded,
  hasEnabledForm,
  webhooksOk,
  loading = false,
}: Props) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <header className="space-y-4">
        <MetaInstantFormsSetupStepsSkeleton />
      </header>
    )
  }

  const steps = [
    {
      done: metaConnected,
      label: t("metaInstantFormsSetupMeta"),
      href: adminClientSettingsSectionPath(slug, "meta"),
      action: !metaConnected,
    },
    {
      done: formsLoaded,
      label: t("metaInstantFormsSetupForms"),
      action: metaConnected && !formsLoaded,
      formsLink: true,
    },
    {
      done: hasEnabledForm,
      label: t("metaInstantFormsSetupEnabled"),
      action: false,
    },
    {
      done: webhooksOk,
      label: t("metaInstantFormsSetupWebhooks"),
      action: false,
    },
  ] as const

  return (
    <header className="space-y-4">
      <ol
        className={cn(adminSectionCardClass, "grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4")}
      >
        {steps.map((step, index) => (
          <li key={index} className="flex gap-2.5 text-sm">
            {step.done ? (
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" aria-hidden />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "font-medium",
                  step.done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {"href" in step && step.action && step.href ? (
                <Link
                  href={step.href}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("metaInstantFormsOpenMetaSettings")}
                </Link>
              ) : null}
              {"formsLink" in step && step.action ? (
                <Link
                  href={formsTabHref}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("metaInstantFormsSetupFormsLink")}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </header>
  )
}
