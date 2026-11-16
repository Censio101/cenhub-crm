import { describe, expect, it } from "vitest"

import {
  auditCustomColumns,
  customColumnUiKind,
  templateHasNotesLikeColumn,
} from "@/lib/lead-sheet/ensure-notes-column"
import type { ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

function miniConfig(
  columns: ResolvedLeadSheetConfig["columns"],
  overrides?: Partial<ResolvedLeadSheetConfig["template"]>
): ResolvedLeadSheetConfig {
  return {
    template: {
      id: "t1",
      name: "Test",
      description: "",
      isSystemDefault: false,
      isShared: true,
      organizationId: null,
      sourceTemplateId: null,
      categoryIds: [],
      formStepsTotal: null,
      ...overrides,
    },
    columns,
  }
}

describe("customColumnUiKind", () => {
  it("maps types to sheet UI", () => {
    expect(customColumnUiKind("textarea")).toBe("textarea-modal")
    expect(customColumnUiKind("select")).toBe("select-dropdown")
    expect(customColumnUiKind("number")).toBe("number-input")
  })
})

describe("templateHasNotesLikeColumn", () => {
  it("detects notes and notes_2", () => {
    const cfg = miniConfig([
      {
        id: "c1",
        sortIndex: 0,
        kind: "custom",
        customField: {
          id: "f1",
          fieldKey: "notes_2",
          label: "Notes",
          fieldType: "text",
          required: false,
          config: {},
        },
      },
    ])
    expect(templateHasNotesLikeColumn(cfg)).toBe(true)
  })
})

describe("auditCustomColumns", () => {
  it("flags wrong type for notes-like labels", () => {
    const cfg = miniConfig([
      {
        id: "c1",
        sortIndex: 0,
        kind: "custom",
        customField: {
          id: "f1",
          fieldKey: "notes_2",
          label: "Notes",
          fieldType: "text",
          required: false,
          config: {},
        },
      },
      {
        id: "c2",
        sortIndex: 1,
        kind: "custom",
        customField: {
          id: "f2",
          fieldKey: "stage",
          label: "Stage",
          fieldType: "select",
          required: false,
          config: { options: [] },
        },
      },
    ])
    const rows = auditCustomColumns(cfg)
    expect(rows.find((r) => r.fieldKey === "notes_2")?.issues).toContain(
      "notes-like field must use field_type textarea"
    )
    expect(rows.find((r) => r.fieldKey === "stage")?.issues).toContain("select field has no options")
    expect(rows.find((r) => r.fieldKey === "notes_2")?.expectedUi).toBe("text-input")
  })
})