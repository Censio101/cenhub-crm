import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import {
  isLeadSheetColumnInlineEditable,
  isLeadSheetColumnReadOnlyBuiltin,
} from "@/lib/leads/sheet-column-editability"

function builtinCol(key: LeadSheetTemplateColumn & { kind: "builtin" }["builtinKey"]): LeadSheetTemplateColumn {
  return { id: "c1", sortIndex: 0, kind: "builtin", builtinKey: key }
}

describe("sheet-column-editability", () => {
  it("treats contact built-ins as read-only in the sheet", () => {
    expect(isLeadSheetColumnReadOnlyBuiltin("email")).toBe(true)
    expect(isLeadSheetColumnReadOnlyBuiltin("fullName")).toBe(true)
    expect(isLeadSheetColumnInlineEditable(builtinCol("email"))).toBe(false)
  })

  it("allows inline edit for operational built-ins", () => {
    expect(isLeadSheetColumnReadOnlyBuiltin("status")).toBe(false)
    expect(isLeadSheetColumnInlineEditable(builtinCol("status"))).toBe(true)
    expect(isLeadSheetColumnInlineEditable(builtinCol("serviceIds"))).toBe(true)
    expect(isLeadSheetColumnInlineEditable(builtinCol("salesPrice"))).toBe(true)
    expect(isLeadSheetColumnInlineEditable(builtinCol("profit"))).toBe(true)
  })

  it("allows inline edit for custom columns", () => {
    const col: LeadSheetTemplateColumn = {
      id: "x",
      sortIndex: 1,
      kind: "custom",
      customField: {
        id: "f",
        fieldKey: "note",
        label: "Note",
        fieldType: "textarea",
        required: false,
        config: {},
      },
    }
    expect(isLeadSheetColumnInlineEditable(col)).toBe(true)
  })
})
