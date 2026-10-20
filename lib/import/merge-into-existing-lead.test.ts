import { describe, expect, it } from "vitest"

import { buildImportMergePatch } from "@/lib/import/merge-into-existing-lead"
import type { Lead } from "@/lib/leads"

const base = (): Lead => ({
  id: "a",
  date: "2026-10-01",
  fullName: "Meta Lead",
  email: "a@b.dk",
  phone: "4512345678",
  segment: "",
  companyName: "",
  address: "",
  zipCode: "",
  city: "",
  serviceIds: [],
  service: "",
  platform: "",
  metaAdId: "",
  status: "new_waiting_call",
  salesPrice: null,
  profit: null,
  ltv: null,
  source: "meta",
  lockedFields: [],
  customFields: {},
})

describe("buildImportMergePatch", () => {
  it("fills service and custom fields when existing lead is empty", () => {
    const incoming: Lead = {
      ...base(),
      source: "import",
      serviceIds: ["vinduespuds"],
      service: "vinduespuds",
      customFields: { platform_1: "fb", annonce: "Hook 1" },
    }
    const patch = buildImportMergePatch(base(), incoming)
    expect(patch?.serviceIds).toEqual(["vinduespuds"])
    expect(patch?.customFields).toEqual({ platform_1: "fb", annonce: "Hook 1" })
  })

  it("does not overwrite existing service", () => {
    const existing = { ...base(), serviceIds: ["fliserens"], service: "fliserens" }
    const incoming = { ...base(), serviceIds: ["vinduespuds"], service: "vinduespuds" }
    expect(buildImportMergePatch(existing, incoming)).toBeNull()
  })
})
