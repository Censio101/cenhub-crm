import { describe, expect, it } from "vitest"

import {
  effectiveWebhookFields,
  sheetEligibleCustomWebhookFields,
  sheetEligibleStandardWebhookKeys,
} from "@/lib/lead-sheet/webhook-fields"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"

function customCol(key: string, label: string): LeadSheetTemplateColumn {
  return {
    id: `c-${key}`,
    sortIndex: 0,
    kind: "custom",
    customField: {
      id: `f-${key}`,
      fieldKey: key,
      label,
      fieldType: "text",
      required: false,
      config: {},
    },
  }
}

describe("webhook-fields", () => {
  it("lists all custom columns as webhook-eligible from the sheet", () => {
    const columns = [customCol("annonce", "Annonce"), customCol("notes", "Notes")]
    expect(sheetEligibleCustomWebhookFields(columns).map((f) => f.key)).toEqual(["annonce", "notes"])
  })

  it("intersects funnel targets with sheet eligibility", () => {
    const config = {
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
      columns: [customCol("annonce", "Annonce")],
    }
    const sheet = buildWebhookLeadSheetInfo(config)!
    const effective = effectiveWebhookFields(sheet, ["fullName", "customFields.annonce"])
    expect(effective.customFields.map((f) => f.key)).toEqual(["annonce"])
    expect(effective.standardFieldKeys).toContain("fullName")
    expect(effective.standardFieldKeys).not.toContain("metaAdId")
  })

  it("always includes locked standard keys from sheet eligibility", () => {
    const columns: LeadSheetTemplateColumn[] = []
    const keys = sheetEligibleStandardWebhookKeys(columns)
    expect(keys).toContain("fullName")
    expect(keys).toContain("email")
    expect(keys).toContain("phone")
  })
})
