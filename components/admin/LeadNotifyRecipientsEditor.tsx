"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { AtSignIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { buildLeadNotifyRecipientList } from "@/lib/leads/notify-new-lead"
import { isValidNotifyEmail, parseNotifyEmailList } from "@/lib/onboarding/notify-emails"
import { cn } from "cn"

const inputClass =
  "w-full rounded-lg border border-[#d3c3b2] bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

type Props = {
  disabled?: boolean
  usePrimaryContact: boolean
  onUsePrimaryContactChange: (value: boolean) => void
  primaryContactEmail: string | null
  companySettingsHref: string
  extraNotifyEmails: string
  onExtraNotifyEmailsChange: (value: string) => void
}

export function LeadNotifyRecipientsEditor({
  disabled = false,
  usePrimaryContact,
  onUsePrimaryContactChange,
  primaryContactEmail,
  companySettingsHref,
  extraNotifyEmails,
  onExtraNotifyEmailsChange,
}: Props) {
  const { t } = useLanguage()
  const extraEmails = useMemo(() => parseNotifyEmailList(extraNotifyEmails), [extraNotifyEmails])

  const activeRecipients = useMemo(
    () =>
      buildLeadNotifyRecipientList({
        usePrimaryContact,
        primaryContactEmail,
        extraNotifyEmails,
      }),
    [usePrimaryContact, primaryContactEmail, extraNotifyEmails]
  )

  const [draftEmail, setDraftEmail] = useState("")
  const [showDraft, setShowDraft] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")

  function updateExtraList(next: string[]) {
    onExtraNotifyEmailsChange(next.length > 0 ? next.join(", ") : "")
  }

  function validateAndNormalize(raw: string): string | null {
    const normalized = raw.trim().toLowerCase()
    if (!normalized) return null
    if (!isValidNotifyEmail(normalized)) {
      setFieldError(t("clientEmailRecipientInvalid"))
      return null
    }
    setFieldError(null)
    return normalized
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    const normalized = validateAndNormalize(draftEmail)
    if (!normalized) return
    if (extraEmails.includes(normalized)) {
      setFieldError(t("clientEmailRecipientDuplicate"))
      return
    }
    if (
      usePrimaryContact &&
      primaryContactEmail?.trim().toLowerCase() === normalized
    ) {
      setFieldError(t("clientEmailRecipientDuplicatePrimary"))
      return
    }
    updateExtraList([...extraEmails, normalized])
    setDraftEmail("")
    setShowDraft(false)
  }

  function handleRemove(email: string) {
    updateExtraList(extraEmails.filter((item) => item !== email))
    if (editingEmail === email) {
      setEditingEmail(null)
      setEditDraft("")
    }
  }

  function startEdit(email: string) {
    setEditingEmail(email)
    setEditDraft(email)
    setFieldError(null)
  }

  function commitEdit(previous: string) {
    const normalized = validateAndNormalize(editDraft)
    if (!normalized) return
    if (normalized !== previous && extraEmails.includes(normalized)) {
      setFieldError(t("clientEmailRecipientDuplicate"))
      return
    }
    if (
      normalized !== previous &&
      usePrimaryContact &&
      primaryContactEmail?.trim().toLowerCase() === normalized
    ) {
      setFieldError(t("clientEmailRecipientDuplicatePrimary"))
      return
    }
    updateExtraList(extraEmails.map((item) => (item === previous ? normalized : item)))
    setEditingEmail(null)
    setEditDraft("")
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e8e0d8] bg-[#faf8f6] px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("clientEmailRecipientsActiveLabel")}
        </p>
        {activeRecipients.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {activeRecipients.map((email) => (
              <li
                key={email}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#d3c3b2] bg-white px-3 py-1 text-sm font-medium text-foreground shadow-sm"
              >
                <AtSignIcon className="size-3.5 shrink-0 text-primary/80" aria-hidden />
                <span className="truncate">{email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-800">{t("clientEmailRecipientsActiveEmpty")}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t("clientEmailRecipientsActiveHint")}</p>
      </div>

      {fieldError ? (
        <p role="alert" className="text-sm text-red-700">
          {fieldError}
        </p>
      ) : null}

      <div className="rounded-xl border border-[#e8e0d8] bg-white shadow-[0_1px_2px_rgba(26,18,8,0.04)]">
        <div className="flex flex-wrap items-start gap-3 border-b border-[#e8e0d8] px-4 py-3">
          <input
            type="checkbox"
            id="lead-notify-use-primary"
            className="mt-1 size-4 rounded border-[#d3c3b2]"
            checked={usePrimaryContact}
            disabled={disabled}
            onChange={(e) => onUsePrimaryContactChange(e.target.checked)}
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="lead-notify-use-primary" className="text-sm font-medium text-foreground">
              {t("clientEmailUsePrimary")}
            </label>
            {primaryContactEmail ? (
              <p className="mt-1 font-mono text-sm text-foreground">{primaryContactEmail}</p>
            ) : (
              <p className="mt-1 text-sm text-amber-800">{t("clientEmailPrimaryMissing")}</p>
            )}
            <Link
              href={companySettingsHref}
              className="mt-1.5 inline-block text-sm font-medium text-primary hover:underline"
            >
              {t("clientEmailChangeCompanyEmail")}
            </Link>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t("clientEmailExtraLabel")}</p>
            <span className="rounded-full bg-[#faf8f6] px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-[#e8e0d8]">
              {t("clientEmailExtraCount", { count: extraEmails.length })}
            </span>
          </div>

          {extraEmails.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#e8e0d8] overflow-hidden rounded-xl border border-[#e8e0d8]">
              {extraEmails.map((email) => (
                <li key={email} className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#faf8f6] text-primary/80 ring-1 ring-[#e8e0d8]">
                    <AtSignIcon className="size-4" aria-hidden />
                  </span>
                  {editingEmail === email ? (
                    <input
                      type="email"
                      className={cn(inputClass, "min-w-0 flex-1 font-mono text-sm")}
                      value={editDraft}
                      disabled={disabled}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => commitEdit(email)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          commitEdit(email)
                        }
                        if (e.key === "Escape") {
                          setEditingEmail(null)
                          setEditDraft("")
                          setFieldError(null)
                        }
                      }}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                      {email}
                    </span>
                  )}
                  <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#faf8f6] hover:text-foreground disabled:opacity-40"
                    disabled={disabled}
                    aria-label={t("clientEmailRecipientEdit")}
                    onClick={() => startEdit(email)}
                  >
                    <PencilIcon className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                    disabled={disabled}
                    aria-label={t("clientEmailRecipientRemove")}
                    onClick={() => handleRemove(email)}
                  >
                    <Trash2Icon className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-[#d3c3b2] bg-[#faf8f6]/60 px-3 py-4 text-sm text-muted-foreground">
              {t("clientEmailExtraEmpty")}
            </p>
          )}

          {showDraft ? (
            <form
              className="mt-3 grid gap-2"
              onSubmit={(e) => {
                void handleAdd(e)
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  className={cn(inputClass, "min-w-0 flex-1 font-mono text-sm")}
                  value={draftEmail}
                  disabled={disabled}
                  placeholder={t("clientEmailRecipientPlaceholder")}
                  autoComplete="off"
                  onChange={(e) => setDraftEmail(e.target.value)}
                />
                <Button type="submit" className="shrink-0" disabled={disabled || !draftEmail.trim()}>
                  {t("clientEmailRecipientAdd")}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-fit px-2 text-sm text-muted-foreground"
                onClick={() => {
                  setShowDraft(false)
                  setDraftEmail("")
                  setFieldError(null)
                }}
              >
                {t("clientEmailRecipientCancel")}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="mt-3 h-10 gap-2 px-2 text-sm font-medium text-primary hover:bg-primary/5"
              disabled={disabled}
              onClick={() => setShowDraft(true)}
            >
              <PlusIcon className="size-4" aria-hidden />
              {t("clientEmailRecipientAddAnother")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
