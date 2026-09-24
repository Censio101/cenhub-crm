export const ONBOARDING_CVR_DIGIT_COUNT = 8
export const ONBOARDING_ZIP_MIN_DIGITS = 4
export const ONBOARDING_ZIP_MAX_DIGITS = 5

export function onboardingDigitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength)
}

export function normalizeOnboardingCvr(raw: string): string | undefined {
  const digits = onboardingDigitsOnly(raw, ONBOARDING_CVR_DIGIT_COUNT)
  if (!digits) return undefined
  if (digits.length !== ONBOARDING_CVR_DIGIT_COUNT) return undefined
  return digits
}

export function isOnboardingCvrValid(value: string): boolean {
  const digits = onboardingDigitsOnly(value, ONBOARDING_CVR_DIGIT_COUNT)
  return digits.length === 0 || digits.length === ONBOARDING_CVR_DIGIT_COUNT
}

export function showOnboardingCvrError(value: string): boolean {
  const digits = onboardingDigitsOnly(value, ONBOARDING_CVR_DIGIT_COUNT)
  return digits.length > 0 && digits.length < ONBOARDING_CVR_DIGIT_COUNT
}

export function normalizeOnboardingZipCode(raw: string): string | null {
  const digits = onboardingDigitsOnly(raw, ONBOARDING_ZIP_MAX_DIGITS)
  if (digits.length < ONBOARDING_ZIP_MIN_DIGITS || digits.length > ONBOARDING_ZIP_MAX_DIGITS) {
    return null
  }
  return digits
}

export function isOnboardingZipComplete(value: string): boolean {
  const digits = onboardingDigitsOnly(value, ONBOARDING_ZIP_MAX_DIGITS)
  return digits.length >= ONBOARDING_ZIP_MIN_DIGITS && digits.length <= ONBOARDING_ZIP_MAX_DIGITS
}

export function showOnboardingZipError(value: string): boolean {
  const digits = onboardingDigitsOnly(value, ONBOARDING_ZIP_MAX_DIGITS)
  return digits.length > 0 && digits.length < ONBOARDING_ZIP_MIN_DIGITS
}
