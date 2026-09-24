export const ONBOARDING_PHONE_DIGIT_COUNT = 8

export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, ONBOARDING_PHONE_DIGIT_COUNT)
}

export function formatOnboardingPhoneDisplay(digits: string): string {
  const normalized = phoneDigitsOnly(digits)
  const parts: string[] = []
  for (let i = 0; i < normalized.length; i += 2) {
    parts.push(normalized.slice(i, i + 2))
  }
  return parts.join(" ")
}

/** Returns 8 digits for storage/API, or null if invalid. */
export function normalizeOnboardingContactPhone(raw: string): string | null {
  const digits = phoneDigitsOnly(raw)
  if (digits.length !== ONBOARDING_PHONE_DIGIT_COUNT) return null
  return digits
}

/** Pretty-print for UI (accepts stored digits or spaced input). */
export function displayOnboardingPhone(value: string): string {
  const digits = phoneDigitsOnly(value)
  if (!digits) return value
  return formatOnboardingPhoneDisplay(digits)
}

export function isOnboardingPhoneComplete(value: string): boolean {
  return phoneDigitsOnly(value).length === ONBOARDING_PHONE_DIGIT_COUNT
}
