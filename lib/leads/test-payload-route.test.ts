import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createLead: vi.fn(),
  resolveLeadSheetForOrganization: vi.fn(),
  listCustomFieldDefs: vi.fn(),
  resolveOrganizationServices: vi.fn(),
  funnel: {
    id: "f1",
    organization_id: "org1",
    platform: "website",
    field_mapping: {} as Record<string, string>,
  },
}))

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }))
vi.mock("@/lib/auth/require-censio-admin", () => ({
  requireCensioAdmin: async () => ({}),
  adminErrorResponse: () => new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
}))
vi.mock("@/lib/db/organizations-repository", () => ({
  getOrganizationBySlug: async (_s: unknown, slug: string) =>
    slug === "acme" ? { id: "org1", slug: "acme" } : null,
}))
vi.mock("@/lib/db/lead-funnels-repository", () => ({
  getLeadFunnelById: async (_s: unknown, id: string) => (id === "f1" ? mocks.funnel : null),
}))
vi.mock("@/lib/db/services-repository", () => ({
  resolveOrganizationServices: mocks.resolveOrganizationServices,
}))
vi.mock("@/lib/db/lead-sheet-repository", () => ({
  resolveLeadSheetForOrganization: mocks.resolveLeadSheetForOrganization,
  listCustomFieldDefs: mocks.listCustomFieldDefs,
}))
vi.mock("@/lib/db/leads-repository", () => ({ createLead: mocks.createLead }))

import { POST } from "@/app/api/admin/organizations/[slug]/funnels/[funnelId]/test-payload/route"

function call(body: unknown, slug = "acme", funnelId = "f1") {
  return POST(
    new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug, funnelId }) }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.funnel.field_mapping = {}
  mocks.resolveLeadSheetForOrganization.mockResolvedValue({})
  mocks.resolveOrganizationServices.mockResolvedValue([])
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
})

describe("test-payload route", () => {
  it("previews the lead and custom values without saving anything", async () => {
    const res = await call({
      payload: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "12345678",
        leadDate: "24-03-2026 14:30",
        customFields: { budget: "5 000", nope: "x" },
      },
    })
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.lead).toMatchObject({ fullName: "Jane Doe", date: "2026-03-24", time: "14:30" })
    expect(data.customFields).toEqual({ budget: 5000 })
    expect(data.warnings).toEqual([expect.objectContaining({ field: "nope" })])
    expect(mocks.createLead).not.toHaveBeenCalled()
  })

  it("applies a draft mapping sent by the editor instead of the saved one", async () => {
    mocks.funnel.field_mapping = { fullName: "wrong" }
    const res = await call({
      payload: { contact: { name: "Mapped Name" }, mail: "m@x.dk", size: "1200" },
      fieldMapping: {
        fullName: "contact.name",
        email: "mail",
        "customFields.budget": "size",
      },
    })
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.lead.fullName).toBe("Mapped Name")
    expect(data.customFields).toEqual({ budget: 1200 })
  })

  it("accepts the sample as a JSON string and reports parse problems", async () => {
    const ok = await call({ payload: JSON.stringify({ fullName: "A B", phone: "123" }) })
    expect((await ok.json()).ok).toBe(true)

    const bad = await call({ payload: "{not json" })
    expect(bad.status).toBe(400)
  })

  it("explains why the real webhook would reject the payload", async () => {
    const res = await call({ payload: { city: "Aarhus" } })
    const data = await res.json()
    expect(data).toEqual({ ok: false, error: "fullName, email or phone is required" })
  })

  it("previews a lead with a missing phone as saved, with a warning", async () => {
    const res = await call({ payload: { fullName: "A B", email: "a@b.c" } })
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.warnings).toEqual([expect.objectContaining({ field: "phone" })])
  })

  it("rejects non-object samples and unknown funnels", async () => {
    expect((await call({ payload: [1, 2] })).status).toBe(400)
    expect((await call({ payload: {} }, "acme", "other")).status).toBe(404)
    expect((await call({ payload: {} }, "unknown")).status).toBe(404)
  })
})
