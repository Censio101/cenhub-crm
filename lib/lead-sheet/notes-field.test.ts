import { describe, expect, it } from "vitest"

import { isInternalSheetNotesField } from "@/lib/lead-sheet/notes-field"

describe("isInternalSheetNotesField", () => {
  it("treats notes-like keys and labels as internal", () => {
    expect(isInternalSheetNotesField("notes")).toBe(true)
    expect(isInternalSheetNotesField("notes_2")).toBe(true)
    expect(isInternalSheetNotesField("besked")).toBe(false)
    expect(isInternalSheetNotesField("formularoplysninger", "Formularoplysninger")).toBe(false)
    expect(isInternalSheetNotesField("comment", "Notes")).toBe(true)
    expect(isInternalSheetNotesField("comment", "Notat")).toBe(true)
  })
})