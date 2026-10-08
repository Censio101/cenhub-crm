"use client"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { adminFieldClass } from "@/components/admin/admin-ui-styles"
import type { OrganizationProfile } from "@/lib/organization-profile"
import { cn } from "cn"
import {
  onboardingDigitsOnly,
  ONBOARDING_CVR_DIGIT_COUNT,
  ONBOARDING_ZIP_MAX_DIGITS,
} from "@/lib/onboarding/digit-fields"
import { formatOnboardingPhoneDisplay, phoneDigitsOnly } from "@/lib/onboarding/phone"

export type CompanyProfileFormValues = {
  name: string
  slug: string
  cvr: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  address: string
  zipCode: string
  city: string
  country: string
  websiteUrl: string
}

export function companyProfileFormValuesFromProfile(
  profile: OrganizationProfile,
  slug: string
): CompanyProfileFormValues {
  return {
    name: profile.name,
    slug,
    cvr: profile.cvr ?? "",
    primaryContactName: profile.primaryContactName,
    primaryContactEmail: profile.primaryContactEmail,
    primaryContactPhone: profile.primaryContactPhone
      ? formatOnboardingPhoneDisplay(profile.primaryContactPhone.replace(/\D/g, "").slice(-8))
      : "",
    address: profile.address,
    zipCode: profile.zipCode,
    city: profile.city,
    country: profile.country || "DK",
    websiteUrl: profile.websiteUrl ?? "",
  }
}

export type CompanyProfileSectionId = "company" | "contact" | "address"

type CompanyProfileFieldsProps = {
  values: CompanyProfileFormValues
  onChange: (values: CompanyProfileFormValues) => void
  readOnly?: boolean
  showSlug?: boolean
  fieldClass?: string
  idPrefix?: string
  sections?: CompanyProfileSectionId[]
  showSectionHeadings?: boolean
}

export function CompanyProfileFields({
  values,
  onChange,
  readOnly = false,
  showSlug = false,
  fieldClass = adminFieldClass,
  idPrefix = "company-profile",
  sections = ["company", "contact", "address"],
  showSectionHeadings = true,
}: CompanyProfileFieldsProps) {
  const { t } = useLanguage()
  const showCompany = sections.includes("company")
  const showContact = sections.includes("contact")
  const showAddress = sections.includes("address")
  const labelClass = "text-xs font-medium text-muted-foreground"

  function update<K extends keyof CompanyProfileFormValues>(key: K, value: CompanyProfileFormValues[K]) {
    if (readOnly) return
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="grid gap-6">
      {showCompany ? (
        <section className="grid gap-3">
          {showSectionHeadings ? (
            <h3 className="text-base font-semibold text-foreground">{t("onboardingSectionCompany")}</h3>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 sm:col-span-2">
              <span className={labelClass}>{t("onboardingFieldCompanyName")}</span>
              <input
                id={`${idPrefix}-name`}
                className={fieldClass}
                value={values.name}
                readOnly={readOnly}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            {showSlug ? (
              <label className="grid gap-1.5 sm:col-span-2">
                <span className={labelClass}>{t("clientProfileSlugLabel")}</span>
                <span className="text-xs text-muted-foreground">{t("clientProfileSlugHint")}</span>
                <input
                  id={`${idPrefix}-slug`}
                  className={cn(fieldClass, "font-mono text-sm")}
                  value={values.slug}
                  readOnly={readOnly}
                  onChange={(e) => update("slug", e.target.value.toLowerCase())}
                />
              </label>
            ) : null}
            <label className="grid gap-1.5">
              <span className={labelClass}>{t("onboardingFieldCvr")}</span>
              <input
                id={`${idPrefix}-cvr`}
                className={fieldClass}
                inputMode="numeric"
                value={values.cvr}
                readOnly={readOnly}
                maxLength={ONBOARDING_CVR_DIGIT_COUNT}
                onChange={(e) =>
                  update("cvr", onboardingDigitsOnly(e.target.value, ONBOARDING_CVR_DIGIT_COUNT))
                }
                placeholder={t("onboardingFieldCvrPlaceholder")}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>{t("onboardingFieldWebsite")}</span>
              <input
                id={`${idPrefix}-website`}
                className={fieldClass}
                value={values.websiteUrl}
                readOnly={readOnly}
                onChange={(e) => update("websiteUrl", e.target.value)}
                placeholder={t("onboardingFieldWebsitePlaceholder")}
              />
            </label>
          </div>
        </section>
      ) : null}

      {showContact ? (
        <section className="grid gap-3">
          {showSectionHeadings ? (
            <h3 className="text-base font-semibold text-foreground">{t("onboardingSectionContact")}</h3>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 sm:col-span-2">
              <span className={labelClass}>{t("onboardingFieldFullName")}</span>
              <input
                className={fieldClass}
                value={values.primaryContactName}
                readOnly={readOnly}
                onChange={(e) => update("primaryContactName", e.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>{t("onboardingFieldEmail")}</span>
              <input
                type="email"
                className={fieldClass}
                value={values.primaryContactEmail}
                readOnly={readOnly}
                onChange={(e) => update("primaryContactEmail", e.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>{t("onboardingFieldPhone")}</span>
              <input
                className={fieldClass}
                inputMode="numeric"
                value={values.primaryContactPhone}
                readOnly={readOnly}
                onChange={(e) =>
                  update(
                    "primaryContactPhone",
                    formatOnboardingPhoneDisplay(phoneDigitsOnly(e.target.value))
                  )
                }
              />
            </label>
          </div>
        </section>
      ) : null}

      {showAddress ? (
        <section className="grid gap-3">
          {showSectionHeadings ? (
            <h3 className="text-base font-semibold text-foreground">{t("onboardingSectionAddress")}</h3>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 sm:col-span-2">
              <span className={labelClass}>{t("onboardingFieldAddress")}</span>
              <input
                className={fieldClass}
                value={values.address}
                readOnly={readOnly}
                onChange={(e) => update("address", e.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>{t("onboardingFieldZip")}</span>
              <input
                className={fieldClass}
                inputMode="numeric"
                value={values.zipCode}
                readOnly={readOnly}
                maxLength={ONBOARDING_ZIP_MAX_DIGITS}
                onChange={(e) =>
                  update("zipCode", onboardingDigitsOnly(e.target.value, ONBOARDING_ZIP_MAX_DIGITS))
                }
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>{t("onboardingFieldCity")}</span>
              <input
                className={fieldClass}
                value={values.city}
                readOnly={readOnly}
                onChange={(e) => update("city", e.target.value)}
              />
            </label>
          </div>
        </section>
      ) : null}
    </div>
  )
}
