"use client"

import Link from "next/link"
import { FormEvent, useMemo, useRef, useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { isValidNotifyEmail, parseNotifyEmailList } from "@/lib/onboarding/notify-emails"
import { cn } from "cn"

type DraftTarget = "to" | "cc"

type Props = {
  disabled?: boolean
  usePrimaryContact: boolean
  onUsePrimaryContactChange: (value: boolean) => void
  primaryContactEmail: string | null
  companySettingsHref: string
  extraNotifyEmails: string
  onExtraNotifyEmailsChange: (value: string) => void
  ccNotifyEmails: string
  onCcNotifyEmailsChange: (value: string) => void
}

function joinEmails(emails: string[]) {
  return emails.length > 0 ? emails.join(", ") : ""
}

const pillClass =
  "inline-flex h-9 max-w-full items-center gap-1 rounded-full border border-[#d3c3b2] bg-[#faf8f6] text-sm font-medium text-foreground"

const emailTextClass = "flex h-full min-w-0 items-center truncate leading-normal"

const addPillClass =
  "inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-[#d3c3b2] bg-white px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"

const removeButtonClass =
  "flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40"

const draftInputClass =
  "h-9 w-48 rounded-full border border-[#d3c3b2] bg-white px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

export function LeadNotifyRecipientsEditor({
  disabled = false,
  usePrimaryContact,
  onUsePrimaryContactChange,
  primaryContactEmail,
  companySettingsHref,
  extraNotifyEmails,
  onExtraNotifyEmailsChange,
  ccNotifyEmails,
  onCcNotifyEmailsChange,
}: Props) {
  const { t } = useLanguage()
  const extraEmails = useMemo(() => parseNotifyEmailList(extraNotifyEmails), [extraNotifyEmails])
  const ccEmails = useMemo(() => parseNotifyEmailList(ccNotifyEmails), [ccNotifyEmails])
  const companyEmail = primaryContactEmail?.trim().toLowerCase() || null

  const [draftTarget, setDraftTarget] = useState<DraftTarget | null>(null)
  const [draftEmail, setDraftEmail] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const commitLock = useRef(false)

  const taken = useMemo(() => {
    const set = new Set<string>(extraEmails)
    for (const email of ccEmails) set.add(email)
    if (usePrimaryContact && companyEmail) set.add(companyEmail)
    return set
  }, [extraEmails, ccEmails, usePrimaryContact, companyEmail])

  function openDraft(target: DraftTarget) {
    commitLock.current = false
    setDraftTarget(target)
    setDraftEmail("")
    setFieldError(null)
  }

  function closeDraft() {
    commitLock.current = true
    setDraftEmail("")
    setDraftTarget(null)
    setFieldError(null)
  }

  function commitDraft() {
    if (commitLock.current || !draftTarget) return
    const normalized = draftEmail.trim().toLowerCase()
    if (!normalized) {
      closeDraft()
      return
    }
    if (!isValidNotifyEmail(normalized)) {
      setFieldError(t("clientEmailRecipientInvalid"))
      return
    }
    if (taken.has(normalized) || (draftTarget === "cc" && extraEmails.includes(normalized))) {
      setFieldError(t("clientEmailRecipientDuplicate"))
      return
    }
    if (draftTarget === "to" && ccEmails.includes(normalized)) {
      setFieldError(t("clientEmailRecipientDuplicate"))
      return
    }
    commitLock.current = true
    if (draftTarget === "to") {
      onExtraNotifyEmailsChange(joinEmails([...extraEmails, normalized]))
    } else {
      onCcNotifyEmailsChange(joinEmails([...ccEmails, normalized]))
    }
    setDraftEmail("")
    setDraftTarget(null)
    setFieldError(null)
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    commitDraft()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-[#d3c3b2] accent-primary"
            checked={Boolean(companyEmail) && usePrimaryContact}
            disabled={disabled || !companyEmail}
            onChange={(event) => onUsePrimaryContactChange(event.target.checked)}
          />
          <span className="font-medium text-foreground">{t("clientEmailCompanyEmail")}</span>
        </label>
        {companyEmail ? (
          <span className="min-w-0 truncate text-muted-foreground">{companyEmail}</span>
        ) : (
          <span className="text-xs text-amber-800">{t("clientEmailPrimaryMissing")}</span>
        )}
        <Link href={companySettingsHref} className="text-xs font-medium text-primary hover:underline">
          {t("clientEmailEditCompany")}
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("clientEmailTo")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {companyEmail && usePrimaryContact ? (
            <span className={cn(pillClass, "px-3.5")}>
              <span className={emailTextClass}>{companyEmail}</span>
            </span>
          ) : null}
          {extraEmails.map((email) => (
            <span key={email} className={cn(pillClass, "pr-1.5 pl-3.5")}>
              <span className={emailTextClass}>{email}</span>
              <button
                type="button"
                disabled={disabled}
                className={removeButtonClass}
                aria-label={t("clientEmailRecipientRemove")}
                onClick={() =>
                  onExtraNotifyEmailsChange(joinEmails(extraEmails.filter((item) => item !== email)))
                }
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
          {draftTarget === "to" ? (
            <form className="inline-flex items-center gap-1" onSubmit={handleAdd}>
              <input
                type="email"
                autoFocus
                disabled={disabled}
                value={draftEmail}
                placeholder={t("clientEmailRecipientPlaceholder")}
                className={draftInputClass}
                onChange={(event) => setDraftEmail(event.target.value)}
                onBlur={() => commitDraft()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeDraft()
                }}
              />
            </form>
          ) : (
            <button type="button" disabled={disabled} className={addPillClass} onClick={() => openDraft("to")}>
              <PlusIcon className="size-3.5" aria-hidden />
              {t("clientEmailAddTo")}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("clientEmailCc")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ccEmails.map((email) => (
            <span key={email} className={cn(pillClass, "pr-1.5 pl-3.5")}>
              <span className={emailTextClass}>{email}</span>
              <button
                type="button"
                disabled={disabled}
                className={removeButtonClass}
                aria-label={t("clientEmailRecipientRemove")}
                onClick={() =>
                  onCcNotifyEmailsChange(joinEmails(ccEmails.filter((item) => item !== email)))
                }
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
          {draftTarget === "cc" ? (
            <form className="inline-flex items-center gap-1" onSubmit={handleAdd}>
              <input
                type="email"
                autoFocus
                disabled={disabled}
                value={draftEmail}
                placeholder={t("clientEmailRecipientPlaceholder")}
                className={draftInputClass}
                onChange={(event) => setDraftEmail(event.target.value)}
                onBlur={() => commitDraft()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeDraft()
                }}
              />
            </form>
          ) : (
            <button type="button" disabled={disabled} className={addPillClass} onClick={() => openDraft("cc")}>
              <PlusIcon className="size-3.5" aria-hidden />
              {t("clientEmailAddCc")}
            </button>
          )}
        </div>
      </div>

      {fieldError ? (
        <p role="alert" className="text-xs text-red-700">
          {fieldError}
        </p>
      ) : null}
    </div>
  )
}
