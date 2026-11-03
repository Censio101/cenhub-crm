import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

import {
  filterColumnsForFormSourceFilter,
  QUICK_HEAT_TRAILER_FORM_SOURCE_LABEL,
} from "@/lib/leads/sheet-form-source-columns"

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

describe("filterColumnsForFormSourceFilter", () => {
  const cols = [
    builtin("date"),
    builtin("address"),
    builtin("companyName"),
    builtin("metaAdId"),
    builtin("salesPrice"),
    builtin("status"),
    custom("build_year"),
    custom("note"),
    custom("insulation_notes"),
  ]

  it("keeps all columns when form filter is all", () => {
    expect(filterColumnsForFormSourceFilter(cols, "all")).toHaveLength(9)
  })

  it("keeps full sheet for Beregning form label", () => {
    expect(filterColumnsForFormSourceFilter(cols, "Beregning")).toHaveLength(9)
  })

  it("hides calculation-only columns for Quick-Heat Trailer", () => {
    const keys = filterColumnsForFormSourceFilter(cols, QUICK_HEAT_TRAILER_FORM_SOURCE_LABEL).map(
      (c) => (c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey)
    )
    expect(keys).toEqual(["date", "companyName", "salesPrice", "status", "note"])
    expect(keys).not.toContain("address")
    expect(keys).not.toContain("metaAdId")
    expect(keys).not.toContain("build_year")
  })
})
