"use client"

import { FormEvent, useEffect, useState } from "react"
import { AtSignIcon, BellIcon, PlusIcon, Trash2Icon } from "lucide-react"

import {
  adminFieldClass,
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { cn } from "cn"
import { isValidNotifyEmail, parseNotifyEmailList } from "@/lib/onboarding/notify-emails"

type Props = {
  initialEmails: string[]
  mailConfigured: boolean
  onEmailsChange: (emails: string[]) => void
}

export function OnboardingNotifyRecipientsPanel({
  initialEmails,
  mailConfigured,
  onEmailsChange,
}: Props) {
  const { t } = useLanguage()
  const [savedEmails, setSavedEmails] = useState(initialEmails)
  const [draftEmail, setDraftEmail] = useState("")
  const [showDraft, setShowDraft] = useState(initialEmails.length === 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setSavedEmails(initialEmails)
    setShowDraft(initialEmails.length === 0)
    setDraftEmail("")
  }, [initialEmails.join("\n")])

  async function persistEmails(
    nextEmails: string[],
    successKey:
      | "integrationsOnboardingNotifyAdded"
      | "integrationsOnboardingNotifyRemoved" = "integrationsOnboardingNotifyAdded"
  ) {
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/admin/integrations/onboarding-notify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: nextEmails }),
      })
      const data = (await response.json()) as {
        onboardingNotifyEmails?: string | null
        error?: string
      }
      if (!response.ok) {
        throw new Error(data.error ?? t("integrationsErrorSave"))
      }

      const parsed = parseNotifyEmailList(data.onboardingNotifyEmails)
      setSavedEmails(parsed)
      onEmailsChange(parsed)
      setDraftEmail("")
      setShowDraft(parsed.length === 0)
      setNotice(t(successKey))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("integrationsErrorSave"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft(event: FormEvent) {
    event.preventDefault()
    const draft = draftEmail.trim().toLowerCase()
    if (!draft) return
    if (!isValidNotifyEmail(draft)) {
      setError(t("integrationsOnboardingNotifyInvalid"))
      return
    }
    if (savedEmails.includes(draft)) {
      setError(t("integrationsOnboardingNotifyDuplicate"))
      return
    }
    await persistEmails([...savedEmails, draft])
  }

  async function handleRemove(email: string) {
    await persistEmails(
      savedEmails.filter((item) => item !== email),
      "integrationsOnboardingNotifyRemoved"
    )
  }

  const hasAlerts = Boolean(error || notice || !mailConfigured)

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden")}>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e8e0d8] bg-[#faf8f6] px-5 py-3.5">
        <span className={adminIconBoxClass("violet")}>
          <BellIcon className="size-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("integrationsOnboardingNotifyTitle")}
          </h2>
          <p className="mt-0.5 max-w-xl text-[13px] text-muted-foreground">
            {t("integrationsOnboardingNotifyDescription")}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-[#e8e0d8]">
          {t("integrationsOnboardingNotifyCount", { count: savedEmails.length })}
        </span>
      </div>

      <div className="grid gap-4 px-5 py-4">
        {hasAlerts ? (
          <FormNoticeStack
            error={error}
            success={notice}
            warning={!mailConfigured ? t("integrationsOnboardingNotifyMailRequired") : null}
            onDismissError={() => setError(null)}
            onDismissSuccess={() => setNotice(null)}
            dismissLabel={t("noticeDismiss")}
            size={adminFormNoticeDefaults.size}
            errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
            successAutoDismissMs={adminFormNoticeDefaults.quickSuccessAutoDismissMs}
            warningAutoDismissMs={0}
          />
        ) : null}

        {savedEmails.length > 0 ? (
          <ul className="divide-y divide-[#e8e0d8] overflow-hidden rounded-xl border border-[#e8e0d8] bg-white shadow-[0_1px_2px_rgba(26,18,8,0.04)]">
            {savedEmails.map((email) => (
              <li key={email} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#faf8f6] text-primary/80 ring-1 ring-[#e8e0d8]">
                  <AtSignIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                  {email}
                </span>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  disabled={saving}
                  onClick={() => {
                    void handleRemove(email)
                  }}
                  aria-label={t("integrationsOnboardingNotifyRemoveEmail")}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d3c3b2] bg-[#faf8f6]/50 px-4 py-5 text-center">
            <p className="text-[13px] font-medium text-foreground">
              {t("integrationsOnboardingNotifyEmptyTitle")}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {t("integrationsOnboardingNotifyEmptyBody")}
            </p>
          </div>
        )}

        {showDraft ? (
          <form
            className="rounded-xl border border-[#e8e0d8] bg-white p-4 shadow-[0_1px_2px_rgba(26,18,8,0.04)]"
            onSubmit={(event) => {
              void handleSaveDraft(event)
            }}
          >
            <label className="grid gap-2">
              <span className="text-[13px] font-semibold text-foreground">
                {savedEmails.length > 0
                  ? t("integrationsOnboardingNotifyAddAnother")
                  : t("integrationsOnboardingNotifyEmails")}
              </span>
              <p className="text-[12px] text-muted-foreground">{t("integrationsOnboardingNotifyHint")}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  className={cn(adminFieldClass, "min-w-0 flex-1")}
                  value={draftEmail}
                  onChange={(event) => setDraftEmail(event.target.value)}
                  placeholder={t("integrationsOnboardingNotifyEmailPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                />
                <Button
                  type="submit"
                  className="h-11 shrink-0 px-6"
                  disabled={saving || !draftEmail.trim()}
                >
                  {saving ? t("saving") : t("integrationsOnboardingNotifySave")}
                </Button>
              </div>
            </label>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-fit gap-2 px-2 text-[13px] font-medium text-primary hover:bg-primary/5"
            onClick={() => setShowDraft(true)}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            {t("integrationsOnboardingNotifyAddAnother")}
          </Button>
        )}
      </div>
    </section>
  )
}
