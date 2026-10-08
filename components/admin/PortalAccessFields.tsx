"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from "lucide-react"

import { adminFieldClass, adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { generatePortalPassword, portalPasswordStrengthScore } from "@/lib/auth/generate-password"
import {
  isPortalPasswordValid,
  PORTAL_PASSWORD_MIN_LENGTH,
  type PortalAccess,
  type PortalAccessMethod,
} from "@/lib/auth/portal-access"
import { translate } from "@/lib/i18n"
import { cn } from "cn"

export type PortalAccessDraft = {
  method: PortalAccessMethod
  password: string
}

export const INITIAL_PORTAL_ACCESS_DRAFT: PortalAccessDraft = { method: "password", password: "" }

export function portalAccessFromDraft(draft: PortalAccessDraft): PortalAccess {
  return draft.method === "password"
    ? { method: "password", password: draft.password }
    : { method: "email" }
}

export function isPortalAccessDraftValid(draft: PortalAccessDraft): boolean {
  return draft.method === "email" || isPortalPasswordValid(draft.password)
}

export type PortalLogin = { email: string; password: string; clientSlug?: string }

function useCopyFeedback() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return { copied, copy }
}

function MethodRow({
  checked,
  label,
  onSelect,
  disabled,
}: {
  checked: boolean
  label: string
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] font-medium transition-colors disabled:opacity-60",
        checked
          ? "border-primary bg-primary/5 text-foreground"
          : "border-[#d3c3b2] bg-white text-foreground hover:bg-[#faf8f6]"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-primary" : "border-[#d3c3b2]"
        )}
        aria-hidden="true"
      >
        {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      {label}
    </button>
  )
}

export function PortalPasswordInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(true)
  const { copied, copy } = useCopyFeedback()
  const tooShort = value.length > 0 && !isPortalPasswordValid(value)
  const score = portalPasswordStrengthScore(value)
  const strengthLabel =
    value.length === 0
      ? null
      : score <= 1
        ? t("portalPasswordStrengthWeak")
        : score === 2
          ? t("portalPasswordStrengthFair")
          : score === 3
            ? t("portalPasswordStrengthGood")
            : t("portalPasswordStrengthStrong")

  return (
    <div className="grid gap-2">
      <label className="grid gap-1.5" htmlFor={id}>
        <span className="text-[13px] font-semibold text-foreground">{t("password")}</span>
        <div className="relative">
          <input
            id={id}
            type={visible ? "text" : "password"}
            className={cn(adminFieldClass, "pr-20 font-mono text-[14px] tracking-wide")}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => event.target.select()}
            minLength={PORTAL_PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            spellCheck={false}
            disabled={disabled}
            required
            aria-invalid={tooShort}
          />
          <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-0.5">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#faf8f6] hover:text-foreground"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? t("portalPasswordHide") : t("portalPasswordShow")}
            >
              {visible ? (
                <EyeOffIcon className="size-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#faf8f6] hover:text-foreground"
              disabled={disabled || !value}
              aria-label={copied ? t("portalCopied") : t("portalCopy")}
              onClick={() => void copy(value)}
            >
              {copied ? (
                <CheckIcon className="size-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <CopyIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn("h-9 gap-1.5 px-3 text-[13px]", adminOutlineButtonClass)}
          disabled={disabled}
          onClick={() => {
            onChange(generatePortalPassword())
            setVisible(true)
          }}
        >
          <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          {t("portalPasswordGenerate")}
        </Button>
        {strengthLabel ? (
          <span
            className={cn(
              "text-[12.5px] font-medium",
              score <= 1 && "text-red-700",
              score === 2 && "text-amber-800",
              score >= 3 && "text-emerald-800"
            )}
          >
            {strengthLabel}
          </span>
        ) : null}
      </div>
      {tooShort ? (
        <p className="text-[12.5px] text-red-700">
          {t("portalPasswordMinLength", { count: PORTAL_PASSWORD_MIN_LENGTH })}
        </p>
      ) : null}
    </div>
  )
}

/** Same pattern as invite Censio admin: method radios + optional password field. */
export function PortalAccessFields({
  value,
  onChange,
  loginEmail,
  disabled,
  idPrefix = "portal-access",
  title,
}: {
  value: PortalAccessDraft
  onChange: (value: PortalAccessDraft) => void
  loginEmail?: string
  disabled?: boolean
  idPrefix?: string
  title?: string
}) {
  const { t } = useLanguage()
  const heading = title ?? t("portalAccessTitle")
  const prefilled = useRef(false)

  useEffect(() => {
    if (prefilled.current) return
    prefilled.current = true
    if (value.method === "password" && !value.password) {
      onChange({ ...value, password: generatePortalPassword() })
    }
  }, [value, onChange])

  return (
    <fieldset className="grid gap-3" disabled={disabled}>
      <legend className="mb-0.5 text-[13px] font-semibold text-foreground">{heading}</legend>
      {loginEmail ? (
        <p className="text-[12.5px] text-muted-foreground">
          {t("portalAccessLoginEmail", { email: loginEmail })}
        </p>
      ) : null}
      <div className="grid gap-2" role="radiogroup" aria-label={heading}>
        <MethodRow
          checked={value.method === "password"}
          label={t("methodPassword")}
          disabled={disabled}
          onSelect={() =>
            onChange({
              method: "password",
              password: value.password || generatePortalPassword(),
            })
          }
        />
        <MethodRow
          checked={value.method === "email"}
          label={t("methodEmailInvite")}
          disabled={disabled}
          onSelect={() => onChange({ ...value, method: "email" })}
        />
      </div>
      {value.method === "password" ? (
        <PortalPasswordInput
          id={`${idPrefix}-password`}
          value={value.password}
          onChange={(password) => onChange({ ...value, password })}
          disabled={disabled}
        />
      ) : null}
    </fieldset>
  )
}

export function PortalLoginDetails({
  login,
  onDone,
  className,
}: {
  login: PortalLogin
  onDone?: () => void
  className?: string
}) {
  const { t, locale } = useLanguage()
  const { copied, copy } = useCopyFeedback()
  const loginUrl = `${window.location.origin}/login`

  const copyText = translate(locale, "portalLoginCopyTemplate", {
    email: login.email,
    password: login.password,
    url: loginUrl,
  })

  return (
    <section
      className={cn(
        "grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4",
        className
      )}
      role="status"
    >
      <div>
        <h3 className="text-[14px] font-semibold text-emerald-900">{t("portalLoginDetailsTitle")}</h3>
        <p className="mt-0.5 text-[13px] text-emerald-900/80">{t("portalLoginDetailsHint")}</p>
      </div>
      <dl className="grid gap-2 text-[13px]">
        <div>
          <dt className="text-muted-foreground">{t("email")}</dt>
          <dd className="font-medium break-all">{login.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("password")}</dt>
          <dd className="font-mono font-medium break-all">{login.password}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("portalLoginDetailsUrl")}</dt>
          <dd className="font-medium break-all">{loginUrl}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-9 gap-2 px-3.5 text-[13px]" onClick={() => void copy(copyText)}>
          {copied ? (
            <CheckIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <CopyIcon className="size-3.5" aria-hidden="true" />
          )}
          {copied ? t("portalCopied") : t("portalLoginDetailsCopyAll")}
        </Button>
        {login.clientSlug ? (
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/admin/clients/${login.clientSlug}`} />}
            className={cn("h-9 gap-1.5 px-3.5 text-[13px]", adminOutlineButtonClass)}
          >
            {t("onboardingOpenClient")}
          </Button>
        ) : null}
        {onDone ? (
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 px-3.5 text-[13px]", adminOutlineButtonClass)}
            onClick={onDone}
          >
            {t("portalLoginDetailsDone")}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
