import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  update: vi.fn(),
  funnel: {
    id: "f1",
    organization_id: "org1",
    name: "Form",
    slug: "form",
    platform: "website",
    enabled: true,
    field_mapping: {},
    webhook_secret: "s",
    sample_listening_until: null as string | null,
    sample_payload: null as Record<string, unknown> | null,
    sample_received_at: null as string | null,
    sample_error: null as string | null,
    created_at: "",
    updated_at: "",
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
  getLeadFunnelById: async (_s: unknown, id: string) =>
    id === "f1"
      ? mocks.funnel
      : id === "foreign"
        ? { ...mocks.funnel, id: "foreign", organization_id: "other" }
        : null,
  isFunnelListening: (f: { sample_listening_until: string | null }) =>
    Boolean(f.sample_listening_until && new Date(f.sample_listening_until) > new Date()),
  startFunnelSampleListening: mocks.start,
  stopFunnelSampleListening: mocks.stop,
  clearFunnelSample: mocks.clear,
  updateLeadFunnel: mocks.update,
  generateWebhookSecret: () => "new",
  deleteLeadFunnel: vi.fn(),
}))

import { GET, POST } from "@/app/api/admin/organizations/[slug]/funnels/[funnelId]/sample/route"
import { PATCH } from "@/app/api/admin/organizations/[slug]/funnels/[funnelId]/route"

const ctx = (slug = "acme", funnelId = "f1") => ({ params: Promise.resolve({ slug, funnelId }) })
const post = (action: string, ...c: [string?, string?]) =>
  POST(
    new Request("http://x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }),
    ctx(...c)
  )

beforeEach(() => {
  vi.clearAllMocks()
  mocks.funnel.enabled = true
  mocks.funnel.sample_listening_until = null
  mocks.funnel.sample_payload = null
  mocks.start.mockResolvedValue({
    ...mocks.funnel,
    sample_listening_until: new Date(Date.now() + 300_000).toISOString(),
  })
  mocks.stop.mockResolvedValue(mocks.funnel)
  mocks.clear.mockResolvedValue(mocks.funnel)
  mocks.update.mockResolvedValue(mocks.funnel)
})

describe("sample route", () => {
  it("reports the sample and the seconds left while listening", async () => {
    mocks.funnel.sample_listening_until = new Date(Date.now() + 120_000).toISOString()
    mocks.funnel.sample_payload = { name: "Jane" }
    const data = await (await GET(new Request("http://x"), ctx())).json()
    expect(data.sample).toEqual({ name: "Jane" })
    expect(data.listeningSeconds).toBeGreaterThan(100)
    expect(data.listeningSeconds).toBeLessThanOrEqual(120)
  })

  it("starts, stops and clears", async () => {
    const started = await (await post("listen")).json()
    expect(mocks.start).toHaveBeenCalledWith(expect.anything(), "f1", "org1")
    expect(started.listeningSeconds).toBeGreaterThan(0)
    await post("stop")
    expect(mocks.stop).toHaveBeenCalled()
    await post("clear")
    expect(mocks.clear).toHaveBeenCalled()
  })

  it("will not listen on a disabled webhook", async () => {
    mocks.funnel.enabled = false
    expect((await post("listen")).status).toBe(400)
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it("rejects unknown actions and other clients' webhooks", async () => {
    expect((await post("nope")).status).toBe(400)
    expect((await post("listen", "acme", "foreign")).status).toBe(404)
    expect((await post("listen", "unknown")).status).toBe(404)
  })
})

describe("funnel PATCH dataFormat", () => {
  const patch = (body: Record<string, unknown>) =>
    PATCH(
      new Request("http://x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      ctx()
    )

  it("saves the chosen format without touching the mapping or the sample", async () => {
    await patch({ dataFormat: "ours" })
    const args = mocks.update.mock.calls[0][3]
    expect(args.dataFormat).toBe("ours")
    expect(args.fieldMapping).toBeUndefined()
    expect(args.clearSample).toBeUndefined()
  })

  it("rejects an unknown format", async () => {
    expect((await patch({ dataFormat: "other" })).status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
