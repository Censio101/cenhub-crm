import type { WorkspaceIntegrationsPublic } from "@/lib/admin/workspace-integrations"
import { sendMailWithIntegrations } from "@/lib/email/mailgun"
import type { UserRole } from "@/lib/db/types"

type InviteEmailInput = {
  to: string
  actionLink: string
  role: UserRole
  organizationName?: string | null
  fullName?: string | null
  isExistingUser?: boolean
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function inviteCopy(input: InviteEmailInput) {
  const greeting = input.fullName?.trim() ? `Hej ${input.fullName.trim()}` : "Hej"

  if (input.isExistingUser) {
    return {
      greeting,
      subject: "Du har fået adgang til Censio CRM",
      preheader: "Log ind med din eksisterende Censio-konto.",
      headline: "Du har fået adgang",
      intro:
        input.role === "censio_admin"
          ? "Du er blevet tilføjet som Censio admin og kan nu logge ind i admin workspace."
          : `Du er blevet tilføjet til ${input.organizationName ?? "jeres klient"} på Censio CRM.`,
      buttonLabel: "Log ind",
      footer:
        "Hvis knappen ikke virker, kan du logge ind direkte på Censio CRM med den e-mail, du allerede bruger hos os.",
    }
  }

  if (input.role === "censio_admin") {
    return {
      greeting,
      subject: "Invitation til Censio admin",
      preheader: "Acceptér invitationen for at oprette adgang til Censio admin.",
      headline: "Invitation til Censio admin",
      intro:
        "Du er inviteret til Censio admin workspace. Klik på knappen herunder for at oprette din adgangskode og komme i gang.",
      buttonLabel: "Acceptér invitation",
      footer:
        "Hvis du ikke forventede denne e-mail, kan du ignorere den. Linket udløber automatisk.",
    }
  }

  return {
    greeting,
    subject: `Invitation til ${input.organizationName ?? "Censio CRM"}`,
    preheader: `Du er inviteret til ${input.organizationName ?? "Censio CRM"}.`,
    headline: `Invitation til ${input.organizationName ?? "Censio CRM"}`,
    intro:
      "Du er inviteret til Censio CRM. Klik på knappen herunder for at oprette din adgangskode og få adgang til dashboardet.",
    buttonLabel: "Acceptér invitation",
    footer:
      "Hvis du ikke forventede denne e-mail, kan du ignorere den. Linket udløber automatisk.",
  }
}

function renderInviteEmailHtml(
  settings: WorkspaceIntegrationsPublic,
  input: InviteEmailInput
): string {
  const copy = inviteCopy(input)
  const siteUrl = settings.siteUrl
  const actionLink = escapeHtml(input.actionLink)
  const replyTo = escapeHtml(settings.mailFrom)

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
                <div style="font-size:13px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;opacity:0.92;">Censio</div>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:600;">${escapeHtml(copy.headline)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.5;">${escapeHtml(copy.greeting)},</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(copy.intro)}</p>
                <p style="margin:0 0 24px;">
                  <a href="${actionLink}" style="display:inline-block;background:#e4660c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:999px;">
                    ${escapeHtml(copy.buttonLabel)}
                  </a>
                </p>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(copy.footer)}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;word-break:break-all;">
                  ${actionLink}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #f0e8df;background:#faf8f6;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  Sendt fra Censio · <a href="${escapeHtml(siteUrl)}" style="color:#e4660c;text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
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

function renderInviteEmailText(
  settings: WorkspaceIntegrationsPublic,
  input: InviteEmailInput
): string {
  const copy = inviteCopy(input)

  return `${copy.greeting},

${copy.intro}

${copy.buttonLabel}: ${input.actionLink}

${copy.footer}

—
Censio
${settings.mailFrom}`
}

export async function sendInviteEmail(
  settings: WorkspaceIntegrationsPublic,
  input: InviteEmailInput
): Promise<void> {
  const copy = inviteCopy(input)

  await sendMailWithIntegrations(settings, {
    to: input.to,
    subject: copy.subject,
    html: renderInviteEmailHtml(settings, input),
    text: renderInviteEmailText(settings, input),
    replyTo: settings.mailFrom,
  })
}
