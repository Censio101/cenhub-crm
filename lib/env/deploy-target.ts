/** Staging / preview deployments must not send live email by default when blocked. */
export function shouldBlockOutboundEmail(): boolean {
  if (process.env.CRM_BLOCK_OUTBOUND_EMAIL === "1") return true
  if (process.env.CRM_APP_ENV === "staging") return true
  if (process.env.VERCEL_ENV === "preview") return true
  return false
}

export function isNonProductionDeploy(): boolean {
  return process.env.CRM_APP_ENV === "staging" || process.env.VERCEL_ENV === "preview"
}