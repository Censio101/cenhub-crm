export const PUBLIC_SIGNUP_PATH = "/tilmelding"

export function buildPublicSignupUrl(siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/+$/, "")
  return `${origin}${PUBLIC_SIGNUP_PATH}`
}
