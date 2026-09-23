import type { WorkspaceIntegrationsPublic } from "@/lib/admin/workspace-integrations"

export type SendMailInput = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export async function sendMailWithIntegrations(
  settings: WorkspaceIntegrationsPublic,
  input: SendMailInput
): Promise<void> {
  if (!settings.mailgunApiKey || !settings.mailgunDomain) {
    throw new Error("Mailgun is not configured")
  }

  const from = `${settings.mailFromName} <${settings.mailFrom}>`
  const body = new URLSearchParams({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  if (input.replyTo) {
    body.set("h:Reply-To", input.replyTo)
  }

  const response = await fetch(
    `${settings.mailgunApiBase}/v3/${settings.mailgunDomain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${settings.mailgunApiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(
      detail
        ? `Mailgun request failed: ${detail.slice(0, 240)}`
        : `Mailgun request failed (${response.status})`
    )
  }
}
