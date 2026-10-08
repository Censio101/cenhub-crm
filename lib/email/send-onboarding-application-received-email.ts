import type { WorkspaceIntegrationsPublic } from "@/lib/admin/workspace-integrations"
import type { OnboardingApplicationRow } from "@/lib/db/types"
import { sendMailWithIntegrations } from "@/lib/email/mailgun"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function receivedCopy(application: OnboardingApplicationRow) {
  const name = application.contact_full_name.trim()
  const greeting = name ? `Hej ${name}` : "Hej"

  return {
    subject: "Vi har modtaget din ansøgning til Censio CRM",
    preheader: "Din ansøgning er under behandling. Vi informerer dig, når den er godkendt.",
    headline: "Vi har modtaget din ansøgning",
    greeting,
    intro:
      "Din ansøgning er under behandling. Vi gennemgår den og informerer dig, når den er godkendt.",
    footer:
      "Hvis du ikke har sendt ansøgningen, kan du ignorere e-mailen eller svare, så vi kan hjælpe.",
  }
}

function renderHtml(
  settings: WorkspaceIntegrationsPublic,
  application: OnboardingApplicationRow
): string {
  const copy = receivedCopy(application)
  const replyTo = escapeHtml(settings.mailFrom)
  const siteUrl = settings.siteUrl

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1eb;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f1a17;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1eb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0d8;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#e4660c 0%,#c4530a 100%);color:#ffffff;">
                <div style="font-size:13px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;opacity:0.92;">Censio CRM</div>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:600;">${escapeHtml(copy.headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.5;">${escapeHtml(copy.greeting)},</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(copy.intro)}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(copy.footer)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #f0e8df;background:#faf8f6;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  Censio CRM · <a href="${escapeHtml(siteUrl)}" style="color:#e4660c;text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
                  · <a href="mailto:${replyTo}" style="color:#e4660c;text-decoration:none;">${replyTo}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function renderText(
  settings: WorkspaceIntegrationsPublic,
  application: OnboardingApplicationRow
): string {
  const copy = receivedCopy(application)

  return `${copy.greeting},

${copy.intro}

${copy.footer}

—
Censio CRM
${settings.mailFrom}`
}

export async function sendOnboardingApplicationReceivedEmail(
  settings: WorkspaceIntegrationsPublic,
  application: OnboardingApplicationRow
): Promise<void> {
  if (!settings.mailConfigured) {
    console.warn(
      "Onboarding applicant confirmation skipped: Mailgun is not configured (application",
      application.id,
      ")"
    )
    return
  }

  const copy = receivedCopy(application)

  await sendMailWithIntegrations(settings, {
    to: application.contact_email,
    subject: copy.subject,
    html: renderHtml(settings, application),
    text: renderText(settings, application),
    replyTo: settings.mailFrom,
  })
}
