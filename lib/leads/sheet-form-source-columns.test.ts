import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

import { funnelFormViewsToMap } from "@/lib/leads/funnel-sheet-column-profile"
import {
  distinctLeadFormSourceLabels,
  shouldShowLeadFormSourceFilter,
} from "@/lib/leads/sheet-form-source-filter"
import { filterColumnsForFormSourceFilter } from "@/lib/leads/sheet-form-source-columns"

const builtin = (key: string) =>
  ({ id: key, sortIndex: 0, kind: "builtin", builtinKey: key }) as LeadSheetTemplateColumn

const custom = (fieldKey: string) =>
  ({
    id: fieldKey,
    sortIndex: 0,
    kind: "custom",
    customField: {
      id: "c1",
      fieldKey,
      label: fieldKey,
      fieldType: "text",
      required: false,
      config: {},
    },
  }) as LeadSheetTemplateColumn

describe("sheet-form-source-filter", () => {
  it("collects distinct labels", () => {
    expect(
      distinctLeadFormSourceLabels([
        { funnelSourceLabel: "Beregning" },
        { funnelSourceLabel: "Quick-Heat Trailer" },
        { funnelSourceLabel: "Beregning" },
      ])
    ).toEqual(["Beregning", "Quick-Heat Trailer"])
  })

  it("shows filter when two or more form sources exist", () => {
    expect(shouldShowLeadFormSourceFilter([{ funnelSourceLabel: "A" }])).toBe(false)
    expect(
      shouldShowLeadFormSourceFilter([
        { funnelSourceLabel: "A" },
        { funnelSourceLabel: "B" },
      ])
    ).toBe(true)
  })
})

describe("filterColumnsForFormSourceFilter", () => {
  const cols = [
    builtin("date"),
    builtin("address"),
    builtin("status"),
    custom("build_year"),
    custom("note"),
  ]

  const configs = funnelFormViewsToMap([
    {
      label: "Quick-Heat Trailer",
      webhookFieldTargets: ["leadDate", "fullName", "customFields.note"],
    },
  ])

  it("hides calculation-only columns for compact form label", () => {
    const keys = filterColumnsForFormSourceFilter(cols, "Quick-Heat Trailer", configs).map((c) =>
      c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey
    )
    expect(keys).toEqual(["date", "status", "note"])
  })
})
