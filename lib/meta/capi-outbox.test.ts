import { beforeEach, describe, expect, it, vi } from "vitest"

import type { LeadRow } from "@/lib/db/types"

const mocks = vi.hoisted(() => ({
  config: null as null | Record<string, unknown>,
  insertError: null as null | { code: string; message: string },
  inserted: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  post: vi.fn(),
}))

function fakeAdmin() {
  return {
    from: () => {
      let pendingInsert: Record<string, unknown> | null = null
      const builder = {
        insert(payload: Record<string, unknown>) {
          pendingInsert = payload
          if (!mocks.insertError) mocks.inserted.push(payload)
          return builder
        },
        select() {
          return builder
        },
        single() {
          return Promise.resolve(
            mocks.insertError
              ? { data: null, error: mocks.insertError }
              : { data: { id: "evt-1", attempts: 0, ...pendingInsert }, error: null }
          )
        },
        update(patch: Record<string, unknown>) {
          mocks.updates.push(patch)
          return { eq: () => Promise.resolve({ error: null }) }
        },
      }
      return builder
    },
  }
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeAdmin() }))
vi.mock("@/lib/db/meta-config-repository", () => ({
  getMetaConfigRow: async () => mocks.config,
}))
vi.mock("@/lib/meta/resolve-page-access-token", () => ({
  resolveMarketingAccessTokenForConfig: () => "token",
}))
vi.mock("next/server", () => ({
  // Outside a web request `after` throws; the outbox must then just run the task itself.
  after: () => {
    throw new Error("after called outside a request scope")
  },
}))
vi.mock("@/lib/meta/conversions-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/meta/conversions-api")>()),
  postCapiEvents: mocks.post,
}))

import {
  queueQualifiedLeadEvent,
  queueWonLeadEvent,
  runAfterResponse,
  sendQueuedCapiEvent,
} from "./capi-outbox"

function lead(partial: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "lead-1",
    organization_id: "org-1",
    legacy_id: "123456789012345",
    status: "won",
    sales_price: 25_000,
    source: "meta",
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    ...partial,
  } as LeadRow
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.config = { capi_enabled: true, meta_pixel_id: "999" }
  mocks.insertError = null
  mocks.inserted = []
  mocks.updates = []
  mocks.post.mockResolvedValue({ ok: true, status: 200, body: { events_received: 1 }, error: null, permanent: false })
})

describe("queueWonLeadEvent", () => {
  it("queues and sends one event for a Meta lead that is won with a price", async () => {
    await queueWonLeadEvent(lead())

    expect(mocks.inserted).toHaveLength(1)
    expect(mocks.inserted[0]).toMatchObject({
      lead_id: "lead-1",
      meta_lead_id: "123456789012345",
      event_name: "Purchase",
      value: 25_000,
      currency: "DKK",
      status: "pending",
    })
    expect(mocks.post).toHaveBeenCalledTimes(1)
    const [pixelId, token, events] = mocks.post.mock.calls[0]
    expect([pixelId, token]).toEqual(["999", "token"])
    expect(events[0].user_data.lead_id).toBe("123456789012345")
    expect(events[0].custom_data.value).toBe(25_000)
    expect(mocks.updates.at(-1)).toMatchObject({ status: "sent" })
  })

  it("does nothing when the switch is off or the lead is not won", async () => {
    mocks.config = { capi_enabled: false, meta_pixel_id: "999" }
    await queueWonLeadEvent(lead())
    mocks.config = { capi_enabled: true, meta_pixel_id: "999" }
    await queueWonLeadEvent(lead({ status: "call_1" }))

    expect(mocks.inserted).toHaveLength(0)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("waits for a sales price instead of sending a value of zero", async () => {
    await queueWonLeadEvent(lead({ sales_price: null }))
    await queueWonLeadEvent(lead({ sales_price: 0 }))
    expect(mocks.inserted).toHaveLength(0)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("records leads that did not come from a Meta form as skipped and sends nothing", async () => {
    await queueWonLeadEvent(lead({ source: "website", legacy_id: "hook:f1:abc" }))

    expect(mocks.inserted).toHaveLength(1)
    expect(mocks.inserted[0]).toMatchObject({ status: "skipped", skip_reason: "not_from_meta" })
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("records a skip when no pixel is chosen", async () => {
    mocks.config = { capi_enabled: true, meta_pixel_id: "" }
    await queueWonLeadEvent(lead())
    expect(mocks.inserted[0]).toMatchObject({ status: "skipped", skip_reason: "no_pixel" })
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("never sends the same lead twice", async () => {
    mocks.insertError = { code: "23505", message: "duplicate key" }
    await queueWonLeadEvent(lead())
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("keeps a failed event for a retry and does not throw when Meta says no", async () => {
    mocks.post.mockResolvedValue({
      ok: false,
      status: 500,
      body: { error: { message: "temporary", code: 2 } },
      error: "temporary",
      permanent: false,
    })
    await expect(queueWonLeadEvent(lead())).resolves.toBeUndefined()
    expect(mocks.updates.at(-1)).toMatchObject({ status: "failed", attempts: 1, last_error: "temporary" })
  })
})

describe("queueQualifiedLeadEvent", () => {
  it("sends one Qualified event, without a value, the first time a Meta lead qualifies", async () => {
    await queueQualifiedLeadEvent(lead({ status: "waiting_on_client", sales_price: null }), "call_2")

    expect(mocks.inserted).toHaveLength(1)
    expect(mocks.inserted[0]).toMatchObject({
      lead_id: "lead-1",
      event_name: "Qualified",
      value: null,
      status: "pending",
    })
    const events = mocks.post.mock.calls[0][2]
    expect(events[0].event_name).toBe("Qualified")
    expect(events[0].custom_data.value).toBeUndefined()
    expect(events[0].user_data.lead_id).toBe("123456789012345")
  })

  it("does nothing for calls, or when the lead was already qualified", async () => {
    await queueQualifiedLeadEvent(lead({ status: "call_1" }), "new_waiting_call")
    await queueQualifiedLeadEvent(lead({ status: "proposal_sent" }), "waiting_on_client")
    expect(mocks.inserted).toHaveLength(0)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("ignores leads that did not come from Meta, are too old, or when the switch is off", async () => {
    await queueQualifiedLeadEvent(
      lead({ status: "awaiting_proposal", source: "website", legacy_id: "hook:f1:abc" }),
      "call_1"
    )
    await queueQualifiedLeadEvent(
      lead({
        status: "awaiting_proposal",
        created_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      }),
      "call_1"
    )
    mocks.config = { capi_enabled: false, meta_pixel_id: "999" }
    await queueQualifiedLeadEvent(lead({ status: "awaiting_proposal" }), "call_1")
    expect(mocks.inserted).toHaveLength(0)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("never sends Qualified twice for the same lead", async () => {
    mocks.insertError = { code: "23505", message: "duplicate key" }
    await queueQualifiedLeadEvent(lead({ status: "won" }), "call_3")
    expect(mocks.post).not.toHaveBeenCalled()
  })
})

describe("sendQueuedCapiEvent", () => {
  const row = {
    id: "evt-9",
    organization_id: "org-1",
    lead_id: "lead-1",
    meta_lead_id: "123456789012345",
    event_name: "Purchase",
    value: 100,
    currency: "DKK",
    status: "pending" as const,
    attempts: 0,
    last_error: null,
    skip_reason: null,
    created_at: new Date().toISOString(),
    sent_at: null,
  }

  it("expires an event older than 7 days instead of sending it", async () => {
    const old = { ...row, event_time: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString() }
    const outcome = await sendQueuedCapiEvent(fakeAdmin() as never, old, { pixelId: "9", token: "t" })
    expect(outcome).toBe("expired")
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it("stops retrying an event Meta rejects as invalid", async () => {
    mocks.post.mockResolvedValue({
      ok: false,
      status: 400,
      body: { error: { message: "Invalid lead_id", code: 100 } },
      error: "Invalid lead_id",
      permanent: true,
    })
    const fresh = { ...row, event_time: new Date().toISOString() }
    await sendQueuedCapiEvent(fakeAdmin() as never, fresh, { pixelId: "9", token: "t" })
    expect(mocks.updates.at(-1)).toMatchObject({ status: "failed", attempts: 60 })
  })
})

describe("runAfterResponse", () => {
  it("runs the task even outside a request, and a failing task never throws", async () => {
    const ran = vi.fn()
    runAfterResponse(async () => ran())
    runAfterResponse(async () => {
      throw new Error("boom")
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(ran).toHaveBeenCalledTimes(1)
  })
})
