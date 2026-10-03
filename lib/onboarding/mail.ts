export type InviteEmailKind = "owner" | "employee" | "censio_admin"

export type InviteEmailInput = {
  to: string
  name: string
  companyName: string
  url: string
  kind: InviteEmailKind
}

export type InviteEmailResult = {
  sent: boolean
  url: string
  error?: string
}

export function inviteEmailSubject(kind: InviteEmailKind): string {
  return kind === "owner"
    ? "I er inviteret til Censio"
    : "Du har fået adgang til Censio"
}

export function inviteEmailHtml(input: InviteEmailInput): string {
  const greeting = input.name ? `Hej ${escapeHtml(input.name)}` : "Hej"
  const intro =
    input.kind === "owner"
      ? `Censio har klargjort ${escapeHtml(input.companyName)} i Censio CRM. Opret din bruger, tjek virksomhedsoplysningerne og giv adgang til dem, der skal med.`
      : `Du er inviteret til ${escapeHtml(input.companyName)} i Censio CRM. Opret din bruger for at få adgang.`

  return `<!doctype html>
<html lang="da">
  <body style="margin:0;padding:32px 16px;background:#f7f7f5;font-family:Outfit,Helvetica,Arial,sans-serif;color:#141414;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:15px;padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#E4660C;">Censio</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;">${inviteEmailSubject(input.kind)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${greeting},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${intro}</p>
          <p style="margin:0 0 28px;">
            <a href="${escapeHtml(input.url)}" style="display:inline-block;background:#E4660C;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:15px;">Åbn invitationen</a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b6560;">Linket udløber om 7 dage. Hvis knappen ikke virker, kan du kopiere denne adresse:<br>${escapeHtml(input.url)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export async function sendInviteEmail(
  input: InviteEmailInput
): Promise<InviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { sent: false, url: input.url }
  }

  const from = process.env.RESEND_FROM?.trim() || "Censio <kontakt@censio.dk>"
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: inviteEmailSubject(input.kind),
      html: inviteEmailHtml(input),
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    return {
      sent: false,
      url: input.url,
      error: detail || `Resend svarede ${response.status}`,
    }
  }

  return { sent: true, url: input.url }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
