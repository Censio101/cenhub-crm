import { describe, expect, it } from "vitest"

import {
  formatServicesForDisplay,
  resolveLeadServicesFields,
} from "@/lib/lead-sheet/service-ids-editor"
import { emptyLead } from "@/lib/leads"
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

describe("resolveLeadServicesFields", () => {
  it("picker mode stores slugs only", () => {
    const result = resolveLeadServicesFields({
      rawValues: ["VVS", "Mystery"],
      editor: "picker",
      services,
    })
    expect(result.serviceIds).toEqual(["vvs"])
    expect(result.serviceLabels).toEqual([])
    expect(result.unknown).toEqual(["Mystery"])
  })

  it("text mode keeps raw labels only", () => {
    const result = resolveLeadServicesFields({
      rawValues: ["VVS", "Mystery"],
      editor: "text",
      services,
    })
    expect(result.serviceIds).toEqual([])
    expect(result.serviceLabels).toEqual(["VVS", "Mystery"])
    expect(result.unknown).toEqual([])
  })
})

describe("formatServicesForDisplay", () => {
  it("text mode prefers stored labels", () => {
    const lead = {
      ...emptyLead("1"),
      serviceIds: ["vvs"],
      serviceLabels: ["Custom label"],
    }
    expect(formatServicesForDisplay(lead, [], "text")).toBe("Custom label")
  })
})
