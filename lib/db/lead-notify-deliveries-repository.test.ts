import { describe, expect, it, vi } from "vitest"

import { recordLeadNotifyDelivery } from "@/lib/db/lead-notify-deliveries-repository"

describe("recordLeadNotifyDelivery", () => {
  it("inserts a delivery row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [{ id: "only" }], error: null }),
      }),
    })
    const del = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    })

    const supabase = {
      from: vi.fn(() => ({
        insert,
        select,
        delete: del,
      })),
    }

    await recordLeadNotifyDelivery(supabase as never, {
      organizationId: "org-1",
      leadId: "lead-1",
      status: "skipped",
      skipReason: "notify_disabled",
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        lead_id: "lead-1",
        status: "skipped",
        skip_reason: "notify_disabled",
      })
    )
  })
})
