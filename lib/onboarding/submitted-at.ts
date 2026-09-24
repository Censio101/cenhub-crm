const DENMARK_TZ = "Europe/Copenhagen"

/** When the application was submitted (UTC ISO string for timestamptz). */
export function onboardingSubmittedAtNow(now = new Date()): string {
  return now.toISOString()
}

/** Calendar date (YYYY-MM-DD) in Denmark — useful for reports and display. */
export function onboardingSubmittedDateInDenmark(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: DENMARK_TZ })
}
