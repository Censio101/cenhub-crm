import type { WorkspaceIntegrationsPublic } from "@/lib/admin/workspace-integrations"
import type { MailgunDeliverySettings } from "@/lib/email/mailgun-delivery-settings"

export type SendMailInput = {
  to: string
  cc?: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export type SendMailResult = {
  messageId: string | null
}

export async function sendMailWithMailgunSettings(
  settings: MailgunDeliverySettings,
  input: SendMailInput
): Promise<SendMailResult> {
  const from = `${settings.mailFromName} <${settings.mailFrom}>`
  const body = new URLSearchParams({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  if (input.cc?.trim()) {
    body.set("cc", input.cc.trim())
  }

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

  const raw = await response.text().catch(() => "")
  if (!raw.trim()) return { messageId: null }
  try {
    const parsed = JSON.parse(raw) as { id?: string; message?: string }
    const id = typeof parsed.id === "string" ? parsed.id : null
    return { messageId: id }
  } catch {
    return { messageId: null }
  }
}

export async function sendMailWithIntegrations(
  settings: WorkspaceIntegrationsPublic,
  input: SendMailInput
): Promise<void> {
  if (!settings.mailgunApiKey || !settings.mailgunDomain) {
    throw new Error("Mailgun is not configured")
  }

  await sendMailWithMailgunSettings(
    {
      mailgunApiKey: settings.mailgunApiKey,
      mailgunDomain: settings.mailgunDomain,
      mailgunApiBase: settings.mailgunApiBase,
      mailFrom: settings.mailFrom,
      mailFromName: settings.mailFromName,
      source: "workspace",
    },
    input
  )
}
