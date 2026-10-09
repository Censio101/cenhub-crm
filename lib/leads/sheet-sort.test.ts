import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { emptyLead, type Lead } from "@/lib/leads"
import {
  compareLeadsByColumn,
  isColumnSortable,
  nextSortDirection,
  sortLeadsBySheetColumn,
  sortLeadsWithSheetState,
} from "@/lib/leads/sheet-sort"

function lead(id: string, patch: Partial<Lead>): Lead {
  return { ...emptyLead(id), ...patch }
}

const salesCol: LeadSheetTemplateColumn = {
  id: "sales",
  sortIndex: 0,
  kind: "builtin",
  builtinKey: "salesPrice",
}

const statusCol: LeadSheetTemplateColumn = {
  id: "st",
  sortIndex: 1,
  kind: "builtin",
  builtinKey: "status",
}

describe("sheet-sort", () => {
  it("sorts numbers with nulls last ascending", () => {
    const a = lead("a", { salesPrice: 100 })
    const b = lead("b", { salesPrice: null })
    const c = lead("c", { salesPrice: 50 })
    const sorted = sortLeadsBySheetColumn([a, b, c], salesCol, "asc")
    expect(sorted.map((l) => l.id)).toEqual(["c", "a", "b"])
  })

  it("orders status by pipeline index not alphabet", () => {
    const won = lead("w", { status: "won" })
    const call1 = lead("c", { status: "call_1" })
    expect(compareLeadsByColumn(call1, won, statusCol, "asc")).toBeLessThan(0)
  })

  it("cycles a column through ascending, descending, then the original order", () => {
    expect(nextSortDirection(null, "sales")).toBe("asc")
    expect(nextSortDirection({ columnId: "sales", direction: "asc" }, "sales")).toBe("desc")
    expect(nextSortDirection({ columnId: "sales", direction: "desc" }, "sales")).toBeNull()
  })

  it("leaves the list in its current order when sorting is cleared", () => {
    const rows = [lead("a", { salesPrice: 100 }), lead("b", { salesPrice: 10 })]
    const dateCol: LeadSheetTemplateColumn = {
      id: "date",
      sortIndex: 2,
      kind: "builtin",
      builtinKey: "date",
    }
    expect(sortLeadsWithSheetState(rows, [salesCol, dateCol], null).map((l) => l.id)).toEqual([
      "a",
      "b",
    ])
  })

  it("isColumnSortable limits to date and deal numbers", () => {
    expect(isColumnSortable(salesCol)).toBe(true)
    expect(isColumnSortable(statusCol)).toBe(false)
    expect(
      isColumnSortable({ id: "n", sortIndex: 0, kind: "builtin", builtinKey: "fullName" })
    ).toBe(false)
  })
})
