import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

import { filterColumnsForSegmentFilter } from "@/lib/leads/sheet-segment-columns"

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

describe("filterColumnsForSegmentFilter", () => {
  const cols = [
    builtin("date"),
    builtin("address"),
    builtin("companyName"),
    custom("iso_info"),
    custom("note"),
  ]

  it("returns all columns when type filter is all", () => {
    expect(filterColumnsForSegmentFilter(cols, "all")).toHaveLength(5)
  })

  it("hides B2C-heavy columns for b2b filter", () => {
    const b2b = filterColumnsForSegmentFilter(cols, "b2b")
    expect(b2b.map((c) => (c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey))).toEqual([
      "date",
      "companyName",
      "note",
    ])
  })
})
