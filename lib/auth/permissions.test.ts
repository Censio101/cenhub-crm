import { beforeEach, describe, expect, it, vi } from "vitest"

import { canDeleteLeads } from "./permissions"

describe("canDeleteLeads", () => {
  it("allows Censio admins and client admins", () => {
    expect(canDeleteLeads("censio_admin")).toBe(true)
    expect(canDeleteLeads("client_admin")).toBe(true)
  })

  it("does not allow client users or unknown roles", () => {
    expect(canDeleteLeads("client_user")).toBe(false)
    expect(canDeleteLeads(null)).toBe(false)
    expect(canDeleteLeads(undefined)).toBe(false)
  })
})

const mocks = vi.hoisted(() => ({
  session: { role: "client_user" as string | null, isDemoFallback: false },
  deleteLeadById: vi.fn(),
}))

vi.mock("@/lib/auth/require-organization-context", () => ({
  requireOrganizationContext: async () => ({
    ...mocks.session,
    userId: "u1",
    organization: { id: "org1" },
  }),
  organizationErrorResponse: () => new Response("{}", { status: 500 }),
}))
vi.mock("@/lib/db/leads-repository", () => ({
  usesDatabaseLeads: () => true,
  deleteLeadById: mocks.deleteLeadById,
  updateLeadById: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }))
vi.mock("@/lib/db/lead-sheet-repository", () => ({ resolveClientDashboardSheet: vi.fn() }))

import { DELETE } from "@/app/api/leads/[id]/route"

function callDelete() {
  return DELETE(new Request("http://localhost/api/leads/l1", { method: "DELETE" }), {
    params: Promise.resolve({ id: "l1" }),
  })
}

describe("DELETE /api/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session = { role: "client_user", isDemoFallback: false }
  })

  it("refuses a client user and deletes nothing", async () => {
    const res = await callDelete()
    expect(res.status).toBe(403)
    expect(mocks.deleteLeadById).not.toHaveBeenCalled()
  })

  it("lets a client admin delete", async () => {
    mocks.session = { role: "client_admin", isDemoFallback: false }
    const res = await callDelete()
    expect(res.status).toBe(200)
    expect(mocks.deleteLeadById).toHaveBeenCalledWith(expect.anything(), "org1", "l1")
  })

  it("lets a Censio admin delete", async () => {
    mocks.session = { role: "censio_admin", isDemoFallback: false }
    expect((await callDelete()).status).toBe(200)
  })
})
