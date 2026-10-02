import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createLead: vi.fn(),
  findLeadIdByLegacyId: vi.fn(),
  resolveLeadSheetForOrganization: vi.fn(),
  listCustomFieldDefs: vi.fn(),
  resolveOrganizationServices: vi.fn(),
  captureFunnelSample: vi.fn(),
  recordFunnelSampleError: vi.fn(),
  funnel: {
    id: "f1",
    organization_id: "org1",
    enabled: true,
    webhook_secret: "secret",
    platform: "website",
    field_mapping: {} as Record<string, string>,
    data_format: "ours" as "ours" | "own",
    sample_listening_until: null as string | null,
  },
}))

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }))
vi.mock("@/lib/db/lead-funnels-repository", () => ({
  getLeadFunnelById: async () => mocks.funnel,
  isFunnelListening: (funnel: { sample_listening_until: string | null }) =>
    Boolean(funnel.sample_listening_until && new Date(funnel.sample_listening_until) > new Date()),
  captureFunnelSample: mocks.captureFunnelSample,
  recordFunnelSampleError: mocks.recordFunnelSampleError,
}))
vi.mock("@/lib/db/leads-repository", () => ({
  createLead: mocks.createLead,
  findLeadIdByLegacyId: mocks.findLeadIdByLegacyId,
}))
vi.mock("@/lib/db/services-repository", () => ({
  resolveOrganizationServices: mocks.resolveOrganizationServices,
}))
vi.mock("@/lib/db/lead-sheet-repository", () => ({
  resolveLeadSheetForOrganization: mocks.resolveLeadSheetForOrganization,
  listCustomFieldDefs: mocks.listCustomFieldDefs,
}))

import { POST } from "@/app/api/webhooks/funnels/[funnelId]/route"

const context = { params: Promise.resolve({ funnelId: "f1" }) }

function post(body: Record<string, unknown>, token = "secret") {
  return POST(
    new Request("http://localhost/api/webhooks/funnels/f1", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    context
  )
}

const base = { fullName: "Jane Doe", email: "jane@example.com", phone: "12345678" }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.funnel.sample_listening_until = null
  mocks.funnel.field_mapping = {}
  mocks.funnel.data_format = "ours"
  mocks.captureFunnelSample.mockResolvedValue(true)
  mocks.createLead.mockImplementation(async (_s, _o, lead) => ({ ...lead, id: "lead-new" }))
  mocks.findLeadIdByLegacyId.mockResolvedValue(null)
  mocks.resolveLeadSheetForOrganization.mockResolvedValue(null)
  mocks.listCustomFieldDefs.mockReturnValue([])
  mocks.resolveOrganizationServices.mockResolvedValue([
    {
      id: "tagdaekning",
      nameDa: "Tagdækning",
      nameEn: "Roofing",
      source: "category",
      categoryNames: [],
    },
    { id: "vvs", nameDa: "VVS", nameEn: "Plumbing", source: "manual", categoryNames: [] },
  ])
})

describe("funnel webhook", () => {
  it("rejects a wrong token", async () => {
    const res = await post(base, "wrong")
    expect(res.status).toBe(401)
    expect(mocks.createLead).not.toHaveBeenCalled()
  })

  it("creates a lead without protection when no externalId is sent", async () => {
    const res = await post(base)
    expect(res.status).toBe(201)
    expect(mocks.findLeadIdByLegacyId).not.toHaveBeenCalled()
    expect(mocks.createLead.mock.calls[0][3]).toEqual({ legacyId: null })
  })

  it("stores the externalId as a funnel-scoped legacy id", async () => {
    const res = await post({ ...base, externalId: "form-123" })
    expect(res.status).toBe(201)
    expect(mocks.createLead.mock.calls[0][3]).toEqual({ legacyId: "hook:f1:form-123" })
  })

  it("matches services by slug or name and warns about unknown ones", async () => {
    const res = await post({ ...base, serviceIds: ["Tagdækning", "vvs", "Moon landing"] })
    expect(res.status).toBe(201)
    expect(mocks.createLead.mock.calls[0][2].serviceIds).toEqual(["tagdaekning", "vvs"])
    const body = await res.json()
    expect(body.warnings).toEqual([
      expect.objectContaining({ field: "serviceIds", message: "Unknown service: Moon landing" }),
    ])
  })

  it("accepts services as one text", async () => {
    await post({ ...base, serviceIds: "Roofing, VVS" })
    expect(mocks.createLead.mock.calls[0][2].serviceIds).toEqual(["tagdaekning", "vvs"])
  })

  it("returns the original lead for a repeated externalId without creating another", async () => {
    mocks.findLeadIdByLegacyId.mockResolvedValue("lead-original")
    const res = await post({ ...base, externalId: "form-123" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, leadId: "lead-original", duplicate: true })
    expect(mocks.createLead).not.toHaveBeenCalled()
  })

  it("resolves a concurrent duplicate through the unique index", async () => {
    mocks.findLeadIdByLegacyId.mockResolvedValueOnce(null).mockResolvedValueOnce("lead-winner")
    mocks.createLead.mockRejectedValueOnce({ code: "23505", message: "duplicate key" })
    const res = await post({ ...base, externalId: "form-123" })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ leadId: "lead-winner", duplicate: true })
  })

  it("still fails on other insert errors", async () => {
    mocks.createLead.mockRejectedValueOnce(new Error("boom"))
    const res = await post({ ...base, externalId: "form-123" })
    expect(res.status).toBe(500)
  })

  it("saves custom columns from the client's sheet and reports skipped ones", async () => {
    mocks.resolveLeadSheetForOrganization.mockResolvedValue({})
    mocks.listCustomFieldDefs.mockReturnValue([
      {
        id: "1",
        fieldKey: "budget",
        label: "Budget",
        fieldType: "number",
        required: false,
        config: {},
      },
    ])
    const res = await post({
      ...base,
      customFields: { budget: "5 000", unknown_key: "x" },
    })
    expect(res.status).toBe(201)
    expect(mocks.createLead.mock.calls[0][2].customFields).toEqual({ budget: 5000 })
    const body = await res.json()
    expect(body.warnings).toEqual([expect.objectContaining({ field: "unknown_key" })])
  })

  it("falls back to today and warns when leadDate is unreadable", async () => {
    const res = await post({ ...base, leadDate: "last tuesday" })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.warnings).toEqual([expect.objectContaining({ field: "leadDate" })])
  })
})

describe("funnel webhook while listening for a sample", () => {
  const listening = () => new Date(Date.now() + 60_000).toISOString()

  function raw(body: string, contentType: string) {
    return POST(
      new Request("http://localhost/api/webhooks/funnels/f1", {
        method: "POST",
        headers: { authorization: "Bearer secret", "content-type": contentType },
        body,
      }),
      context
    )
  }

  it("stores the request as the sample and does not create a lead", async () => {
    mocks.funnel.sample_listening_until = listening()
    const res = await post({ "Your Name": "Jane", note: "hi" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, sample: true })
    expect(mocks.captureFunnelSample).toHaveBeenCalledWith(expect.anything(), "f1", {
      "Your Name": "Jane",
      note: "hi",
    })
    expect(mocks.createLead).not.toHaveBeenCalled()
  })

  it("captures a payload that would not be a valid lead", async () => {
    mocks.funnel.sample_listening_until = listening()
    const res = await post({ contact: { anything: "goes" } })
    expect(res.status).toBe(200)
    expect(mocks.createLead).not.toHaveBeenCalled()
  })

  it("saves the request as a normal lead when another request won the race", async () => {
    mocks.funnel.sample_listening_until = listening()
    mocks.captureFunnelSample.mockResolvedValue(false)
    const res = await post(base)
    expect(res.status).toBe(201)
    expect(mocks.createLead).toHaveBeenCalledTimes(1)
  })

  it("ignores an expired listening window", async () => {
    mocks.funnel.sample_listening_until = new Date(Date.now() - 1000).toISOString()
    const res = await post(base)
    expect(res.status).toBe(201)
    expect(mocks.captureFunnelSample).not.toHaveBeenCalled()
  })

  it("never captures a request with the wrong token", async () => {
    mocks.funnel.sample_listening_until = listening()
    const res = await post(base, "wrong")
    expect(res.status).toBe(401)
    expect(mocks.captureFunnelSample).not.toHaveBeenCalled()
  })

  it("reads a form-encoded sample", async () => {
    mocks.funnel.sample_listening_until = listening()
    const res = await raw("Full+Name=Jane&e-mail=j%40x.dk", "application/x-www-form-urlencoded")
    expect(res.status).toBe(200)
    expect(mocks.captureFunnelSample.mock.calls[0][2]).toEqual({
      "Full Name": "Jane",
      "e-mail": "j@x.dk",
    })
  })

  it("explains why an unreadable request could not be the sample", async () => {
    mocks.funnel.sample_listening_until = listening()
    const res = await raw("[1,2]", "application/json")
    expect(res.status).toBe(400)
    expect(mocks.recordFunnelSampleError).toHaveBeenCalledWith(
      expect.anything(),
      "f1",
      expect.stringContaining("JSON object")
    )
    expect(mocks.captureFunnelSample).not.toHaveBeenCalled()
  })

  it("refuses a sample that is too large", async () => {
    mocks.funnel.sample_listening_until = listening()
    const res = await post({ blob: "x".repeat(60_000) })
    expect(res.status).toBe(413)
    expect(mocks.recordFunnelSampleError).toHaveBeenCalled()
    expect(mocks.captureFunnelSample).not.toHaveBeenCalled()
  })

  it("accepts a form-encoded lead when not listening", async () => {
    const res = await raw(
      "fullName=Jane&email=j%40x.dk&phone=1",
      "application/x-www-form-urlencoded"
    )
    expect(res.status).toBe(201)
    expect(mocks.createLead).toHaveBeenCalledTimes(1)
  })
})

describe("funnel webhook data format", () => {
  const theirs = { "Your Name": "Jane", contact: { mail: "j@x.dk" } }
  const mapping = { fullName: "Your Name", email: "contact.mail" }

  it("applies the saved mapping when the funnel page format is selected", async () => {
    mocks.funnel.field_mapping = mapping
    mocks.funnel.data_format = "own"
    const res = await post(theirs)
    expect(res.status).toBe(201)
    expect(mocks.createLead.mock.calls[0][2]).toMatchObject({
      fullName: "Jane",
      email: "j@x.dk",
    })
  })

  it("keeps the mapping saved but ignores it in our webhook format", async () => {
    mocks.funnel.field_mapping = mapping
    mocks.funnel.data_format = "ours"
    const res = await post(theirs)
    expect(res.status).toBe(422)
    expect(mocks.createLead).not.toHaveBeenCalled()
    expect(mocks.funnel.field_mapping).toEqual(mapping)
  })
})
