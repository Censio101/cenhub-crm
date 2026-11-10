import { describe, expect, it } from "vitest"

import { buildFilteredMappingInboundExample } from "@/lib/lead-sheet/webhook-spec"
import type { ClientService } from "@/lib/services/types"

const services: ClientService[] = [
  { id: "tag", nameDa: "Tag", nameEn: "Tag", source: "category", categoryNames: [] },
]

describe("buildFilteredMappingInboundExample", () => {
  it("uses static CRM example values, not Make templates", () => {
    const body = buildFilteredMappingInboundExample(
      services,
      ["fullName", "email", "phone", "serviceIds", "customFields.b2b_b2c"],
      [{ key: "b2b_b2c", label: "B2B/B2C", type: "text", required: false }]
    )
    const json = JSON.stringify(body)
    expect(json).not.toMatch(/\{\{/)
    expect(body).toMatchObject({
      fullName: "Jane Doe",
      email: "jane@example.com",
      customFields: { b2b_b2c: expect.any(String) },
    })
    expect(body).not.toHaveProperty("data")
  })
})
