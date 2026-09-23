import type { WorkspaceIntegrationsPublic } from "@/lib/admin/workspace-integrations"
import { sendMailWithIntegrations } from "@/lib/email/mailgun"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderAuthEmailHtml(input: {
  settings: WorkspaceIntegrationsPublic
  subject: string
  headline: string
  intro: string
  buttonLabel: string
  actionLink: string
  footer: string
}): string {
  const actionLink = escapeHtml(input.actionLink)
  const siteUrl = escapeHtml(input.settings.siteUrl)
  const replyTo = escapeHtml(input.settings.mailFrom)

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1eb;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f1a17;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1eb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e8e0d8;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#e4660c 0%,#c4530a 100%);color:#ffffff;">
                <div style="font-size:13px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;opacity:0.92;">Censio</div>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:600;">${escapeHtml(input.headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.5;">Hej,</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(input.intro)}</p>
                <p style="margin:0 0 24px;">
                  <a href="${actionLink}" style="display:inline-block;background:#e4660c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:999px;">
                    ${escapeHtml(input.buttonLabel)}
                  </a>
                </p>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(input.footer)}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;word-break:break-all;">${actionLink}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #f0e8df;background:#faf8f6;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  Sendt fra Censio · <a href="${siteUrl}" style="color:#e4660c;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, "")}</a>
                  · Svar til <a href="mailto:${replyTo}" style="color:#e4660c;text-decoration:none;">${replyTo}</a>
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

export async function sendMagicLinkEmail(
  settings: WorkspaceIntegrationsPublic,
  input: { to: string; actionLink: string }
): Promise<void> {
  const subject = "Dit login-link til Censio CRM"
  const intro = "Klik på knappen herunder for at logge ind på Censio CRM. Linket udløber automatisk."
  const footer = "Hvis du ikke bad om dette login-link, kan du ignorere e-mailen."

  await sendMailWithIntegrations(settings, {
    to: input.to,
    subject,
    html: renderAuthEmailHtml({
      settings,
      subject,
      headline: "Log ind på Censio CRM",
      intro,
      buttonLabel: "Log ind",
      actionLink: input.actionLink,
      footer,
    }),
    text: `Hej,

${intro}

Log ind: ${input.actionLink}

${footer}

—
Censio
${settings.mailFrom}`,
    replyTo: settings.mailFrom,
  })
}

export async function sendPasswordResetEmail(
  settings: WorkspaceIntegrationsPublic,
  input: { to: string; actionLink: string }
): Promise<void> {
  const subject = "Nulstil adgangskode til Censio CRM"
  const intro =
    "Du har bedt om at nulstille adgangskoden til Censio CRM. Klik på knappen herunder for at vælge en ny adgangskode."
  const footer = "Hvis du ikke bad om dette, kan du ignorere e-mailen."

  await sendMailWithIntegrations(settings, {
    to: input.to,
    subject,
    html: renderAuthEmailHtml({
      settings,
      subject,
      headline: "Nulstil adgangskode",
      intro,
      buttonLabel: "Nulstil adgangskode",
      actionLink: input.actionLink,
      footer,
    }),
    text: `Hej,

${intro}

Nulstil adgangskode: ${input.actionLink}

${footer}

—
Censio
${settings.mailFrom}`,
    replyTo: settings.mailFrom,
  })
}
