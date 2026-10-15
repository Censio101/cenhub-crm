import { describe, expect, it } from "vitest"

import {
  buildLeadNotifyBodyLinesDa,
  interpolateNotifySubject,
  sampleLeadForNotifyPreview,
} from "@/lib/email/format-new-lead-notify-da"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

const sheetStub: ResolvedLeadSheetConfig = {
  template: {
    id: "t1",
    name: "Test",
    description: "",
    isSystemDefault: true,
    isShared: true,
    organizationId: null,
    sourceTemplateId: null,
    subcategoryIds: [],
    categoryIds: [],
  },
  columns: [
    { id: "c1", sortIndex: 0, kind: "builtin", builtinKey: "fullName" },
    { id: "c2", sortIndex: 1, kind: "builtin", builtinKey: "phone" },
    { id: "c3", sortIndex: 2, kind: "builtin", builtinKey: "address" },
    { id: "c4", sortIndex: 3, kind: "builtin", builtinKey: "zipCode" },
    { id: "c5", sortIndex: 4, kind: "builtin", builtinKey: "city" },
    { id: "c6", sortIndex: 5, kind: "builtin", builtinKey: "serviceIds" },
  ],
}

describe("buildLeadNotifyBodyLinesDa", () => {
  it("skips fields not in included keys", () => {
    const lead = sampleLeadForNotifyPreview()
    const lines = buildLeadNotifyBodyLinesDa({
      lead,
      sheet: sheetStub,
      services: [{ id: "vvs", nameDa: "VVS", nameEn: "VVS", source: "manual", categoryNames: [] }],
      includedKeys: ["builtin:fullName"],
    })
    expect(lines).toEqual(["Fulde navn: Anna Jensen"])
  })

  it("combines address when multiple address keys are included", () => {
    const lead = sampleLeadForNotifyPreview()
    const lines = buildLeadNotifyBodyLinesDa({
      lead,
      sheet: sheetStub,
      services: [],
      includedKeys: ["builtin:address", "builtin:zipCode", "builtin:city"],
    })
    expect(lines).toEqual(["Adresse: Hovedgaden 1, 2100 København Ø"])
  })
})

describe("interpolateNotifySubject", () => {
  it("drops trailing pipe when service is empty", () => {
    const subject = interpolateNotifySubject("Nyt lead fra {webhookNavn} | {service}", {
      funnelName: "Make",
      lead: sampleLeadForNotifyPreview(),
      services: [],
    })
    expect(subject).toBe("Nyt lead fra Make")
  })
})
