import { describe, expect, it } from "vitest"

import { essentialSheetColumns } from "@/lib/leads/sheet-essential-columns"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

function builtin(key: string, id: string): LeadSheetTemplateColumn {
  return { id, sortIndex: 0, kind: "builtin", builtinKey: key as "date" }
}

function custom(key: string, id: string): LeadSheetTemplateColumn {
  return {
    id,
    sortIndex: 0,
    kind: "custom",
    customField: {
      id: `cf-${id}`,
      fieldKey: key,
      label: key,
      fieldType: "text",
      required: false,
      config: {},
    },
  }
}

describe("essentialSheetColumns", () => {
  it("keeps template order and drops low-signal columns", () => {
    const cols = [
      builtin("date", "1"),
      custom("lead_id", "2"),
      builtin("fullName", "3"),
      custom("utm_source", "4"),
      builtin("status", "5"),
    ]
    expect(essentialSheetColumns(cols).map((c) => c.id)).toEqual(["1", "2", "3", "5"])
  })

  it("keeps postcode and city for calling", () => {
    const cols = [
      builtin("fullName", "1"),
      builtin("zipCode", "2"),
      builtin("city", "3"),
      builtin("address", "4"),
      builtin("status", "5"),
    ]
    expect(essentialSheetColumns(cols).map((c) => c.id)).toEqual(["1", "2", "3", "5"])
  })
})
