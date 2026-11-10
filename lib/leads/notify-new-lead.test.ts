import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  recordLeadNotifyDelivery: vi.fn().mockResolvedValue(undefined),
  getOrganizationEmailSettings: vi.fn(),
  isFunnelLeadNotifyEnabled: vi.fn(),
  resolveLeadNotifyMailgunSettings: vi.fn(),
  resolveClientDashboardSheet: vi.fn(),
  resolveOrganizationServices: vi.fn(),
  sendMailWithMailgunSettings: vi.fn(),
}))

vi.mock("@/lib/db/lead-notify-deliveries-repository", () => ({
  recordLeadNotifyDelivery: mocks.recordLeadNotifyDelivery,
}))

vi.mock("@/lib/db/organization-email-settings-repository", () => ({
  getOrganizationEmailSettings: mocks.getOrganizationEmailSettings,
  includedColumnKeysFromRow: () => [],
  isFunnelLeadNotifyEnabled: mocks.isFunnelLeadNotifyEnabled,
}))

vi.mock("@/lib/email/mailgun-delivery-settings", () => ({
  resolveLeadNotifyMailgunSettings: mocks.resolveLeadNotifyMailgunSettings,
}))

vi.mock("@/lib/db/lead-sheet-repository", () => ({
  resolveClientDashboardSheet: mocks.resolveClientDashboardSheet,
}))

vi.mock("@/lib/db/services-repository", () => ({
  resolveOrganizationServices: mocks.resolveOrganizationServices,
}))

vi.mock("@/lib/email/mailgun", () => ({
  sendMailWithMailgunSettings: mocks.sendMailWithMailgunSettings,
}))

vi.mock("@/lib/email/format-new-lead-notify-da", () => ({
  buildLeadNotifyMessageDa: () => ({
    subject: "Subj",
    html: "<p>x</p>",
    text: "x",
  }),
}))

import { notifyNewLeadFromFunnelWebhook } from "@/lib/leads/notify-new-lead"
import type { Lead } from "@/lib/leads"

const lead = {
  id: "lead-1",
  fullName: "Jane Doe",
  email: "jane@example.com",
} as Lead

const baseInput = {
  organizationId: "org-1",
  primaryContactEmail: "info@client.dk",
  funnelId: "funnel-1",
  funnelName: "Main webhook",
  lead,
}

describe("notifyNewLeadFromFunnelWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrganizationEmailSettings.mockResolvedValue({
      lead_notify_enabled: true,
      use_primary_contact: true,
      extra_notify_emails: "",
    })
    mocks.isFunnelLeadNotifyEnabled.mockResolvedValue(true)
    mocks.resolveLeadNotifyMailgunSettings.mockResolvedValue({
      mailgunApiKey: "key",
      mailgunDomain: "mg.example.com",
      mailgunApiBase: "https://api.mailgun.net",
      mailFrom: "from@example.com",
      mailFromName: "Censio",
      source: "workspace",
    })
    mocks.resolveClientDashboardSheet.mockResolvedValue({ visible: { columns: [] } })
    mocks.resolveOrganizationServices.mockResolvedValue([])
    mocks.sendMailWithMailgunSettings.mockResolvedValue({ messageId: "<msg-123>" })
  })

  it("logs skipped when lead notify is disabled", async () => {
    mocks.getOrganizationEmailSettings.mockResolvedValue({ lead_notify_enabled: false })

    await notifyNewLeadFromFunnelWebhook({} as never, baseInput)

    expect(mocks.recordLeadNotifyDelivery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "skipped",
        skipReason: "notify_disabled",
        leadId: "lead-1",
      })
    )
    expect(mocks.sendMailWithMailgunSettings).not.toHaveBeenCalled()
  })

  it("logs skipped when funnel is not selected for email", async () => {
    mocks.isFunnelLeadNotifyEnabled.mockResolvedValue(false)

    await notifyNewLeadFromFunnelWebhook({} as never, baseInput)

    expect(mocks.recordLeadNotifyDelivery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "skipped",
        skipReason: "funnel_not_selected",
      })
    )
  })

  it("logs sent with Mailgun message id on success", async () => {
    await notifyNewLeadFromFunnelWebhook({} as never, baseInput)

    expect(mocks.sendMailWithMailgunSettings).toHaveBeenCalled()
    expect(mocks.recordLeadNotifyDelivery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "sent",
        mailgunMessageId: "<msg-123>",
        recipients: ["info@client.dk"],
      })
    )
  })

  it("logs failed when Mailgun throws", async () => {
    mocks.sendMailWithMailgunSettings.mockRejectedValue(new Error("Mailgun down"))

    await notifyNewLeadFromFunnelWebhook({} as never, baseInput)

    expect(mocks.recordLeadNotifyDelivery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "failed",
        errorMessage: "Mailgun down",
      })
    )
  })
})
