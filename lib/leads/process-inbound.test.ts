import { describe, expect, it } from "vitest"

import { buildInboundLead } from "@/lib/leads/process-inbound"
import type { ClientService } from "@/lib/services/types"

const services: ClientService[] = [
  {
    id: "vvs",
    nameDa: "VVS",
    nameEn: "Plumbing",
    source: "manual",
    categoryNames: [],
  },
]

describe("buildInboundLead serviceIds editor", () => {
  const parsedBase = {
    ok: true as const,
    canonical: {
      fullName: "Test",
      email: "a@b.dk",
      phone: "123",
      leadDate: "2025-01-01",
      serviceIds: ["VVS", "Unknown"],
    },
    mapped: { customFields: {} },
    warnings: [],
  }

  it("picker warns on unknown services", () => {
    const built = buildInboundLead({
      parsed: parsedBase,
      customFieldDefs: [],
      services,
      platform: "webhook",
      serviceIdsEditor: "picker",
    })
    expect(built.lead.serviceIds).toEqual(["vvs"])
    expect(built.lead.serviceLabels).toEqual([])
    expect(built.warnings.some((w) => w.field === "serviceIds")).toBe(true)
  })

  it("text keeps labels and still resolves known slugs", () => {
    const built = buildInboundLead({
      parsed: parsedBase,
      customFieldDefs: [],
      services,
      platform: "webhook",
      serviceIdsEditor: "text",
    })
    expect(built.lead.serviceIds).toEqual([])
    expect(built.lead.serviceLabels).toEqual(["VVS", "Unknown"])
    expect(built.warnings.some((w) => w.field === "serviceIds")).toBe(false)
  })
})
