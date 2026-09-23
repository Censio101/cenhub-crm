"use client"

import { CheckIcon, CircleIcon, XIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

const baseFieldClass =
  "h-11 w-full rounded-[15px] border bg-white px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-1"

type MatchingPasswordFieldsProps = {
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  disabled?: boolean
}

function RequirementRow({
  met,
  label,
  tone = "neutral",
}: {
  met: boolean
  label: string
  tone?: "neutral" | "success" | "error"
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-[13px]",
        met
          ? "text-emerald-700"
          : tone === "error"
            ? "text-red-700"
            : "text-muted-foreground"
      )}
    >
      {met ? (
        <CheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
      ) : tone === "error" ? (
        <XIcon className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CircleIcon className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
      )}
      <span>{label}</span>
    </li>
  )
}

export function getMatchingPasswordState(password: string, confirmPassword: string) {
  const hasMinLength = password.length >= 8
  const hasConfirmInput = confirmPassword.length > 0
  const passwordsMatch = hasConfirmInput && password === confirmPassword
  const showMismatch = hasConfirmInput && password !== confirmPassword

  return {
    hasMinLength,
    hasConfirmInput,
    passwordsMatch,
    showMismatch,
    isValid: hasMinLength && passwordsMatch,
  }
}

export function MatchingPasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false,
}: MatchingPasswordFieldsProps) {
  const { t } = useLanguage()
  const { hasMinLength, passwordsMatch, showMismatch } = getMatchingPasswordState(
    password,
    confirmPassword
  )

  return (
    <div className="grid gap-5">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{t("newPasswordLabel")}</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          disabled={disabled}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className={cn(
            baseFieldClass,
            password.length > 0 && !hasMinLength
              ? "border-amber-300 focus:ring-amber-200"
              : hasMinLength
                ? "border-emerald-300 focus:ring-emerald-200"
                : "border-border focus:ring-ring"
          )}
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{t("confirmPasswordLabel")}</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          disabled={disabled}
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          aria-invalid={showMismatch}
          aria-describedby="password-match-status"
          className={cn(
            baseFieldClass,
            showMismatch
              ? "border-red-300 focus:ring-red-200"
              : passwordsMatch
                ? "border-emerald-300 focus:ring-emerald-200"
                : "border-border focus:ring-ring"
          )}
        />
        {confirmPassword.length > 0 ? (
          <p
            id="password-match-status"
            className={cn(
              "text-[13px] font-medium",
              showMismatch ? "text-red-700" : "text-emerald-700"
            )}
            role="status"
          >
            {showMismatch ? t("passwordMatchMismatch") : t("passwordMatchSuccess")}
          </p>
        ) : null}
      </label>

      <ul className="grid gap-1.5 rounded-xl border border-border bg-[#faf8f6]/80 px-3.5 py-3">
        <RequirementRow
          met={hasMinLength}
          label={t("passwordRequirementLength")}
        />
        <RequirementRow
          met={passwordsMatch}
          label={t("passwordRequirementMatch")}
          tone={showMismatch ? "error" : "neutral"}
        />
      </ul>
    </div>
  )
}
