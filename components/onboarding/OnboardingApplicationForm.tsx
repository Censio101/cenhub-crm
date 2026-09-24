"use client"

import { FormEvent, useMemo, useState } from "react"

import { isOnboardingContactEmailValid } from "@/lib/onboarding/application-input"

import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import { OnboardingApplicationSuccess } from "@/components/onboarding/OnboardingApplicationSuccess"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { FormNoticeStack } from "@/components/ui/form-notice"
import { adminFormNoticeDefaults } from "@/lib/admin/form-notice-defaults"
import { cn } from "cn"
import {
  onboardingDigitsOnly,
  isOnboardingCvrValid,
  isOnboardingZipComplete,
  normalizeOnboardingCvr,
  normalizeOnboardingZipCode,
  ONBOARDING_CVR_DIGIT_COUNT,
  ONBOARDING_ZIP_MAX_DIGITS,
  showOnboardingCvrError,
  showOnboardingZipError,
} from "@/lib/onboarding/digit-fields"
import {
  formatOnboardingPhoneDisplay,
  isOnboardingPhoneComplete,
  normalizeOnboardingContactPhone,
  phoneDigitsOnly,
} from "@/lib/onboarding/phone"
import {
  onboardingFieldErrorSpacerClass,
  onboardingFieldErrorTextClass,
  onboardingInvalidFieldClass,
} from "@/components/onboarding/onboarding-form-ui"

export type OnboardingFormValues = {
  companyName: string
  cvr: string
  contactFullName: string
  contactEmail: string
  contactPhone: string
  address: string
  zipCode: string
  city: string
  country: string
  websiteUrl: string
  consentGiven: boolean
  notes: string
}

function defaultValues(): OnboardingFormValues {
  return {
    companyName: "",
    cvr: "",
    contactFullName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    zipCode: "",
    city: "",
    country: "DK",
    websiteUrl: "",
    consentGiven: false,
    notes: "",
  }
}

type OnboardingApplicationFormProps = {
  mode: "public" | "admin"
  onSubmitted?: (result: { id?: string; organizationSlug?: string }) => void
}

type SubmitResult = { id?: string; organizationSlug?: string }

export function OnboardingApplicationForm({
  mode,
  onSubmitted,
}: OnboardingApplicationFormProps) {
  const { t } = useLanguage()
  const [values, setValues] = useState<OnboardingFormValues>(() => defaultValues())
  const [slugOverride, setSlugOverride] = useState("")
  const [autoApprove, setAutoApprove] = useState(mode === "admin")
  const [seedDemo, setSeedDemo] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validationActive, setValidationActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fieldClass = useMemo(
    () => (mode === "admin" ? adminFieldClass : cn(adminFieldClass, "h-10 text-sm")),
    [mode]
  )

  const phoneComplete = isOnboardingPhoneComplete(values.contactPhone)
  const cvrValid = isOnboardingCvrValid(values.cvr)
  const zipComplete = isOnboardingZipComplete(values.zipCode)

  const showCompanyError = validationActive && !values.companyName.trim()
  const showFullNameError = validationActive && !values.contactFullName.trim()
  const emailTrimmed = values.contactEmail.trim()
  const showEmailRequired = validationActive && !emailTrimmed
  const showEmailInvalid =
    validationActive && emailTrimmed.length > 0 && !isOnboardingContactEmailValid(values.contactEmail)
  const showEmailError = showEmailRequired || showEmailInvalid
  const showPhoneError = validationActive
    ? !phoneComplete
    : values.contactPhone.length > 0 && !phoneComplete
  const showCvrError = validationActive ? !cvrValid : showOnboardingCvrError(values.cvr)
  const showZipError = validationActive
    ? !zipComplete
    : showOnboardingZipError(values.zipCode)
  const showAddressError = validationActive && !values.address.trim()
  const showCityError = validationActive && !values.city.trim()
  const showConsentError =
    validationActive && mode === "public" && !values.consentGiven

  function isClientFormValid(check: OnboardingFormValues): boolean {
    return (
      check.companyName.trim().length > 0 &&
      check.contactFullName.trim().length > 0 &&
      isOnboardingContactEmailValid(check.contactEmail) &&
      isOnboardingPhoneComplete(check.contactPhone) &&
      isOnboardingCvrValid(check.cvr) &&
      check.address.trim().length > 0 &&
      isOnboardingZipComplete(check.zipCode) &&
      check.city.trim().length > 0 &&
      (mode !== "public" || check.consentGiven)
    )
  }

  function firstInvalidFieldId(check: OnboardingFormValues): string | null {
    if (!check.companyName.trim()) return "onboarding-company-name"
    if (!isOnboardingCvrValid(check.cvr)) return "onboarding-cvr"
    if (!check.contactFullName.trim()) return "onboarding-contact-full-name"
    if (!check.contactEmail.trim() || !isOnboardingContactEmailValid(check.contactEmail)) {
      return "onboarding-contact-email"
    }
    if (!isOnboardingPhoneComplete(check.contactPhone)) return "onboarding-contact-phone"
    if (!check.address.trim()) return "onboarding-address"
    if (!isOnboardingZipComplete(check.zipCode)) return "onboarding-zip"
    if (!check.city.trim()) return "onboarding-city"
    if (mode === "public" && !check.consentGiven) return "onboarding-consent"
    return null
  }

  function focusInvalidField(fieldId: string) {
    const element = document.getElementById(fieldId)
    if (!element) return
    element.scrollIntoView({ behavior: "smooth", block: "center" })
    if (element instanceof HTMLElement && "focus" in element) {
      element.focus({ preventScroll: true })
    }
  }

  function update<K extends keyof OnboardingFormValues>(key: K, value: OnboardingFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setValidationActive(true)

    if (!isClientFormValid(values)) {
      const invalidId = firstInvalidFieldId(values)
      if (invalidId) {
        requestAnimationFrame(() => {
          focusInvalidField(invalidId)
        })
      }
      return
    }

    setSubmitting(true)

    try {
      const contactPhone = normalizeOnboardingContactPhone(values.contactPhone)
      if (!contactPhone) {
        throw new Error(t("onboardingSubmitError"))
      }

      const zipCode = normalizeOnboardingZipCode(values.zipCode)
      if (!zipCode) {
        throw new Error(t("onboardingSubmitError"))
      }

      const cvr = normalizeOnboardingCvr(values.cvr)

      const payload = {
        ...values,
        contactPhone,
        zipCode,
        cvr,
        websiteUrl: values.websiteUrl.trim() || undefined,
        notes: values.notes.trim() || undefined,
      }

      const url =
        mode === "public"
          ? "/api/onboarding/applications"
          : "/api/admin/onboarding/applications"

      const body =
        mode === "admin"
          ? {
              ...payload,
              autoApprove,
              slugOverride: slugOverride.trim() || undefined,
              seedDemo,
              demoMode: seedDemo,
            }
          : payload

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as {
        error?: string
        id?: string
        organization?: { slug?: string }
        application?: { id?: string }
      }

      if (!response.ok) {
        throw new Error(data.error ?? t("onboardingSubmitError"))
      }

      const result: SubmitResult = {
        id: data.id ?? data.application?.id,
        organizationSlug: data.organization?.slug,
      }

      setSuccess(true)
      onSubmitted?.(result)

      if (mode === "public") {
        setValues(defaultValues())
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("onboardingSubmitError")
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (success && mode === "public" && !onSubmitted) {
    return <OnboardingApplicationSuccess />
  }

  const submittingLabel =
    mode === "admin" && autoApprove
      ? t("onboardingAdminSubmitting")
      : t("onboardingSubmitting")

  const formSectionClass =
    mode === "public"
      ? "grid gap-4 border-t border-[#efe8e0] pt-6 first:border-t-0 first:pt-0"
      : "grid gap-4"

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="grid gap-6"
      aria-busy={submitting}
    >
      <section
        className={cn(
          formSectionClass,
          mode === "public" && "border-t-0 pt-0"
        )}
      >
        <h2 className="text-base font-semibold text-foreground">
          {t("onboardingSectionCompany")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 self-start sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="onboarding-company-name">
              {t("onboardingFieldCompanyName")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-company-name"
              className={cn(fieldClass, showCompanyError && onboardingInvalidFieldClass)}
              autoComplete="organization"
              value={values.companyName}
              onChange={(event) => update("companyName", event.target.value)}
              aria-invalid={showCompanyError}
              aria-describedby={showCompanyError ? "onboarding-company-name-error" : undefined}
            />
            {showCompanyError ? (
              <p
                id="onboarding-company-name-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldRequired")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5 self-start">
            <label className="text-sm font-medium" htmlFor="onboarding-cvr">
              {t("onboardingFieldCvr")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-cvr"
              className={cn(fieldClass, showCvrError && onboardingInvalidFieldClass)}
              inputMode="numeric"
              autoComplete="off"
              value={values.cvr}
              onChange={(event) =>
                update(
                  "cvr",
                  onboardingDigitsOnly(event.target.value, ONBOARDING_CVR_DIGIT_COUNT)
                )
              }
              placeholder={t("onboardingFieldCvrPlaceholder")}
              maxLength={ONBOARDING_CVR_DIGIT_COUNT}
              aria-invalid={showCvrError}
              aria-describedby={showCvrError ? "onboarding-cvr-error" : undefined}
            />
            {showCvrError ? (
              <p
                id="onboarding-cvr-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldCvrHint")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5 self-start">
            <label className="text-sm font-medium" htmlFor="onboarding-website">
              {t("onboardingFieldWebsite")}
              {mode === "public" ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({t("onboardingFieldOptional")})
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-website"
              className={fieldClass}
              type="text"
              inputMode="url"
              autoComplete="url"
              value={values.websiteUrl}
              onChange={(event) => update("websiteUrl", event.target.value)}
              placeholder={t("onboardingFieldWebsitePlaceholder")}
            />
            {showCvrError ? (
              <div className={onboardingFieldErrorSpacerClass} aria-hidden="true" />
            ) : null}
          </div>
        </div>
      </section>

      <section className={formSectionClass}>
        <h2 className="text-base font-semibold text-foreground">{t("onboardingSectionContact")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 self-start sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="onboarding-contact-full-name">
              {t("onboardingFieldFullName")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-contact-full-name"
              className={cn(fieldClass, showFullNameError && onboardingInvalidFieldClass)}
              autoComplete="name"
              value={values.contactFullName}
              onChange={(event) => update("contactFullName", event.target.value)}
              aria-invalid={showFullNameError}
              aria-describedby={
                showFullNameError ? "onboarding-contact-full-name-error" : undefined
              }
            />
            {showFullNameError ? (
              <p
                id="onboarding-contact-full-name-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldRequired")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5 self-start">
            <label className="text-sm font-medium" htmlFor="onboarding-contact-email">
              {t("onboardingFieldEmail")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-contact-email"
              type="email"
              className={cn(fieldClass, showEmailError && onboardingInvalidFieldClass)}
              value={values.contactEmail}
              onChange={(event) => update("contactEmail", event.target.value)}
              autoComplete="email"
              placeholder={mode === "public" ? t("onboardingFieldEmailPlaceholder") : undefined}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "onboarding-contact-email-error" : undefined}
            />
            {showEmailError ? (
              <p
                id="onboarding-contact-email-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {showEmailRequired
                  ? t("onboardingFieldRequired")
                  : t("onboardingFieldEmailInvalid")}
              </p>
            ) : showPhoneError ? (
              <div className={onboardingFieldErrorSpacerClass} aria-hidden="true" />
            ) : null}
          </div>
          <div className="grid gap-1.5 self-start">
            <label className="text-sm font-medium" htmlFor="onboarding-contact-phone">
              {t("onboardingFieldPhone")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-contact-phone"
              type="tel"
              className={cn(fieldClass, showPhoneError && onboardingInvalidFieldClass)}
              inputMode="numeric"
              autoComplete="tel"
              value={values.contactPhone}
              onChange={(event) =>
                update(
                  "contactPhone",
                  formatOnboardingPhoneDisplay(phoneDigitsOnly(event.target.value))
                )
              }
              placeholder={t("onboardingFieldPhonePlaceholder")}
              maxLength={11}
              aria-invalid={showPhoneError}
              aria-describedby={showPhoneError ? "onboarding-phone-error" : undefined}
            />
            {showPhoneError ? (
              <p
                id="onboarding-phone-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldPhoneHint")}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className={formSectionClass}>
        <h2 className="text-base font-semibold text-foreground">{t("onboardingSectionAddress")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 self-start sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="onboarding-address">
              {t("onboardingFieldAddress")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-address"
              className={cn(fieldClass, showAddressError && onboardingInvalidFieldClass)}
              autoComplete="street-address"
              value={values.address}
              onChange={(event) => update("address", event.target.value)}
              aria-invalid={showAddressError}
              aria-describedby={showAddressError ? "onboarding-address-error" : undefined}
            />
            {showAddressError ? (
              <p
                id="onboarding-address-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldRequired")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5 self-start">
            <label className="text-sm font-medium" htmlFor="onboarding-zip">
              {t("onboardingFieldZip")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-zip"
              className={cn(fieldClass, showZipError && onboardingInvalidFieldClass)}
              inputMode="numeric"
              value={values.zipCode}
              onChange={(event) =>
                update(
                  "zipCode",
                  onboardingDigitsOnly(event.target.value, ONBOARDING_ZIP_MAX_DIGITS)
                )
              }
              placeholder={t("onboardingFieldZipPlaceholder")}
              autoComplete="postal-code"
              maxLength={ONBOARDING_ZIP_MAX_DIGITS}
              aria-invalid={showZipError}
              aria-describedby={showZipError ? "onboarding-zip-error" : undefined}
            />
            {showZipError ? (
              <p
                id="onboarding-zip-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldZipHint")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5 self-start">
            <label className="text-sm font-medium" htmlFor="onboarding-city">
              {t("onboardingFieldCity")}
              {mode === "public" ? (
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </label>
            <input
              id="onboarding-city"
              className={cn(fieldClass, showCityError && onboardingInvalidFieldClass)}
              autoComplete="address-level2"
              placeholder={mode === "public" ? t("onboardingFieldCityPlaceholder") : undefined}
              value={values.city}
              onChange={(event) => update("city", event.target.value)}
              aria-invalid={showCityError}
              aria-describedby={showCityError ? "onboarding-city-error" : undefined}
            />
            {showCityError ? (
              <p
                id="onboarding-city-error"
                className={onboardingFieldErrorTextClass}
                role="alert"
              >
                {t("onboardingFieldRequired")}
              </p>
            ) : null}
            {showZipError && !showCityError ? (
              <div className={onboardingFieldErrorSpacerClass} aria-hidden="true" />
            ) : null}
          </div>
        </div>
      </section>

      {mode === "admin" ? (
        <section className="grid gap-3 rounded-xl border border-[#d3c3b2] bg-[#faf8f6] p-4">
          <h2 className="text-base font-semibold text-foreground">{t("onboardingAdminOptions")}</h2>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{t("onboardingFieldSlugOverride")}</span>
            <input
              className={fieldClass}
              value={slugOverride}
              onChange={(event) => setSlugOverride(event.target.value)}
              placeholder={t("onboardingFieldSlugPlaceholder")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(event) => setAutoApprove(event.target.checked)}
            />
            {t("onboardingAutoApprove")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={seedDemo}
              onChange={(event) => setSeedDemo(event.target.checked)}
            />
            {t("onboardingSeedDemo")}
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{t("onboardingFieldNotes")}</span>
            <textarea
              className={cn(fieldClass, "min-h-24 py-2")}
              value={values.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>
        </section>
      ) : (
        <div className={cn(formSectionClass, "gap-1.5")}>
          <label className="flex items-start gap-2 text-sm leading-relaxed">
            <input
              id="onboarding-consent"
              type="checkbox"
              className={cn("mt-1", showConsentError && "outline outline-2 outline-offset-2 outline-red-400")}
              checked={values.consentGiven}
              onChange={(event) => update("consentGiven", event.target.checked)}
              aria-invalid={showConsentError}
              aria-describedby={showConsentError ? "onboarding-consent-error" : undefined}
            />
            <span>{t("onboardingConsentLabel")}</span>
          </label>
          {showConsentError ? (
            <p
              id="onboarding-consent-error"
              className={onboardingFieldErrorTextClass}
              role="alert"
            >
              {t("onboardingConsentRequired")}
            </p>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "grid gap-4",
          mode === "public" && "border-t border-[#efe8e0] pt-6"
        )}
      >
        <FormNoticeStack
          progress={submitting ? submittingLabel : null}
          error={error}
          onDismissError={() => setError(null)}
          dismissLabel={t("noticeDismiss")}
          size={adminFormNoticeDefaults.size}
          errorAutoDismissMs={adminFormNoticeDefaults.errorAutoDismissMs}
        />

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full sm:min-w-[12rem]"
        >
        {submitting
          ? submittingLabel
          : mode === "public"
            ? t("onboardingSubmitPublic")
            : t("onboardingSubmitAdmin")}
        </Button>
      </div>
    </form>
  )
}
