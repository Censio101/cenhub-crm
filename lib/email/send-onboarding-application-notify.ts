import type { WorkspaceIntegrationsPublic } from "@/lib/admin/workspace-integrations"
import type { OnboardingApplicationRow } from "@/lib/db/types"
import { sendMailWithIntegrations } from "@/lib/email/mailgun"
import { displayOnboardingPhone } from "@/lib/onboarding/phone"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatLine(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return ""
  return `${label}: ${trimmed}`
}

export async function sendOnboardingApplicationNotifyEmail(
  settings: WorkspaceIntegrationsPublic,
  application: OnboardingApplicationRow,
  recipients: string[]
): Promise<void> {
  if (recipients.length === 0) return
  if (!settings.mailConfigured) {
    console.warn(
      "Onboarding notify skipped: Mailgun is not configured (application",
      application.id,
      ")"
    )
    return
  }

  const reviewUrl = `${settings.siteUrl}/admin/onboarding`
  const company = application.company_name.trim()
  const subject = `Ny klientansøgning: ${company}`

  const detailLines = [
    formatLine("Virksomhed", application.company_name),
    formatLine("CVR", application.cvr),
    formatLine("Kontakt", application.contact_full_name),
    formatLine("E-mail", application.contact_email),
    formatLine("Telefon", displayOnboardingPhone(application.contact_phone)),
    formatLine("Adresse", `${application.address}, ${application.zip_code} ${application.city}`),
    formatLine("Website", application.website_url),
    formatLine("Ansøgnings-ID", application.id),
  ].filter(Boolean)

  const text = [
    "Der er modtaget en ny klientansøgning via tilmeldingsformularen.",
    "",
    ...detailLines,
    "",
    `Gennemgå ansøgningen: ${reviewUrl}`,
  ].join("\n")

  const htmlDetails = detailLines
    .map((line) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#3d342c;">${escapeHtml(line)}</p>`)
    .join("")

  const html = `<!DOCTYPE html>
<html lang="da">
  <body style="margin:0;padding:24px;background:#f6f1eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d8;border-radius:16px;padding:28px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b45309;">Censio onboarding</p>
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#1c1917;">Ny klientansøgning</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#57534e;">
        ${escapeHtml(company)} har ansøgt om adgang. Gennemgå og godkend eller afvis i admin.
      </p>
      ${htmlDetails}
      <p style="margin:24px 0 0;">
        <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:10px;">
          Åbn ansøgninger
        </a>
      </p>
    </div>
  </body>
</html>`

  await sendMailWithIntegrations(settings, {
    to: recipients.join(", "),
    subject,
    html,
    text,
    replyTo: application.contact_email,
  })
}
