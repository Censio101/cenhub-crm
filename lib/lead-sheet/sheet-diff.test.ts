import { describe, expect, it } from "vitest"

import { findFieldTypeConflicts } from "@/lib/lead-sheet/sheet-diff"
import type { CustomFieldType, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

function sheet(fields: Array<[string, CustomFieldType]>): ResolvedLeadSheetConfig {
  return {
    template: {
      id: "t",
      name: "t",
      description: "",
      isSystemDefault: false,
      isShared: true,
      organizationId: null,
      sourceTemplateId: null,
      subcategoryIds: [],
      categoryIds: [],
    },
    columns: fields.map(([key, type], index) => ({
      id: `c${index}`,
      sortIndex: index,
      kind: "custom" as const,
      customField: {
        id: `f${index}`,
        fieldKey: key,
        label: key.toUpperCase(),
        fieldType: type,
        required: false,
        config: {},
      },
    })),
  }
}

describe("findFieldTypeConflicts", () => {
  it("reports keys whose type differs between sheets", () => {
    const conflicts = findFieldTypeConflicts(
      sheet([
        ["budget", "number"],
        ["note", "text"],
      ]),
      sheet([
        ["budget", "text"],
        ["note", "text"],
        ["extra", "date"],
      ])
    )
    expect(conflicts).toEqual([{ key: "budget", label: "BUDGET", from: "number", to: "text" }])
  })

  it("reports nothing when types match or sheets are unrelated", () => {
    expect(findFieldTypeConflicts(sheet([["a", "text"]]), sheet([["a", "text"]]))).toEqual([])
    expect(findFieldTypeConflicts(sheet([["a", "text"]]), sheet([["b", "number"]]))).toEqual([])
    expect(findFieldTypeConflicts(null, sheet([["a", "text"]]))).toEqual([])
  })
})
