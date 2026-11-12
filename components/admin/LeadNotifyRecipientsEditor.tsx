"use client"

import Link from "next/link"
import { FormEvent, useMemo, useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { isValidNotifyEmail, parseNotifyEmailList } from "@/lib/onboarding/notify-emails"
import { cn } from "cn"

const inputClass =
  "h-9 w-full min-w-0 rounded-lg border border-[#d3c3b2] bg-white px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

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

  const [draftEmail, setDraftEmail] = useState("")
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
    if (usePrimaryContact && primaryContactEmail?.trim().toLowerCase() === normalized) {
      setFieldError(t("clientEmailRecipientDuplicatePrimary"))
      return
    }
    updateExtraList([...extraEmails, normalized])
    setDraftEmail("")
  }

  function handleRemove(email: string) {
    updateExtraList(extraEmails.filter((item) => item !== email))
    if (editingEmail === email) {
      setEditingEmail(null)
      setEditDraft("")
    }
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
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <input
          type="checkbox"
          id="lead-notify-use-primary"
          className="size-4 shrink-0 rounded border-[#d3c3b2]"
          checked={usePrimaryContact}
          disabled={disabled}
          onChange={(e) => onUsePrimaryContactChange(e.target.checked)}
        />
        <label htmlFor="lead-notify-use-primary" className="shrink-0 font-medium text-foreground">
          {t("clientEmailCompanyEmail")}
        </label>
        {primaryContactEmail ? (
          <span className="min-w-0 truncate font-mono text-muted-foreground">{primaryContactEmail}</span>
        ) : (
          <span className="text-xs text-amber-800">{t("clientEmailPrimaryMissing")}</span>
        )}
        <Link
          href={companySettingsHref}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("clientEmailEditCompany")}
        </Link>
      </div>

      {extraEmails.length > 0 ? (
        <ul className="divide-y divide-[#ebe4dc] rounded-lg border border-[#e8e0d8] bg-white">
          {extraEmails.map((email) => (
            <li key={email} className="flex items-center gap-1 px-2 py-1">
              {editingEmail === email ? (
                <input
                  type="email"
                  className={cn(inputClass, "flex-1 font-mono text-xs")}
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
                <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-foreground">
                  {email}
                </span>
              )}
              <button
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-[#faf8f6] disabled:opacity-40"
                disabled={disabled}
                aria-label={t("clientEmailRecipientEdit")}
                onClick={() => {
                  setEditingEmail(email)
                  setEditDraft(email)
                  setFieldError(null)
                }}
              >
                <PencilIcon className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                disabled={disabled}
                aria-label={t("clientEmailRecipientRemove")}
                onClick={() => handleRemove(email)}
              >
                <Trash2Icon className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          void handleAdd(e)
        }}
      >
        <input
          type="email"
          className={cn(inputClass, "flex-1 font-mono text-xs")}
          value={draftEmail}
          disabled={disabled}
          placeholder={t("clientEmailRecipientPlaceholder")}
          autoComplete="off"
          onChange={(e) => setDraftEmail(e.target.value)}
        />
        <Button
          type="submit"
          size="sm"
          className="h-9 shrink-0 px-3"
          disabled={disabled || !draftEmail.trim()}
        >
          {t("clientEmailRecipientAdd")}
        </Button>
      </form>

      {fieldError ? (
        <p role="alert" className="text-xs text-red-700">
          {fieldError}
        </p>
      ) : null}
    </div>
  )
}
