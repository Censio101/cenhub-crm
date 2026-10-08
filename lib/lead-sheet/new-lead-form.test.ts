import { describe, expect, it } from "vitest"

import { groupNewLeadColumns, validateNewLead } from "@/lib/lead-sheet/new-lead-form"
import type {
  BuiltinColumnKey,
  CustomFieldType,
  LeadSheetTemplateColumn,
} from "@/lib/lead-sheet/types"
import { emptyLead, type Lead } from "@/lib/leads"

function builtin(key: BuiltinColumnKey, index: number): LeadSheetTemplateColumn {
  return { id: `b${index}`, sortIndex: index, kind: "builtin", builtinKey: key }
}

function custom(
  key: string,
  type: CustomFieldType,
  index: number,
  extra: { required?: boolean; options?: string[] } = {}
): LeadSheetTemplateColumn {
  return {
    id: `c${index}`,
    sortIndex: index,
    kind: "custom",
    customField: {
      id: `f${index}`,
      fieldKey: key,
      label: key,
      fieldType: type,
      required: extra.required ?? false,
      config: extra.options ? { options: extra.options } : {},
    },
  }
}

const CORE: BuiltinColumnKey[] = ["date", "fullName", "email", "phone", "status"]
const coreColumns = CORE.map(builtin)

function filled(overrides: Partial<Lead> = {}): Lead {
  return {
    ...emptyLead("lead-1"),
    fullName: "Anna Jensen",
    email: "anna@example.com",
    phone: "12345678",
    ...overrides,
  }
}

describe("groupNewLeadColumns", () => {
  it("only shows the fields the sheet has, grouped and ordered", () => {
    const sections = groupNewLeadColumns([
      builtin("city", 0),
      builtin("phone", 1),
      builtin("fullName", 2),
      builtin("profit", 3),
      builtin("metaAdId", 4),
      builtin("date", 5),
      custom("roof", "select", 6, { options: ["Tile"] }),
      custom("note", "text", 7),
    ])
    expect(sections.contact).toEqual(["fullName", "phone"])
    expect(sections.company).toEqual(["city"])
    expect(sections.details).toEqual(["date", "profit"])
    expect(sections.custom.map((c) => c.customField.fieldKey)).toEqual(["roof", "note"])
  })

  it("returns empty groups for an empty sheet", () => {
    expect(groupNewLeadColumns([])).toEqual({ contact: [], company: [], details: [], custom: [] })
  })
})

describe("validateNewLead", () => {
  it("accepts a valid lead and trims contact fields", () => {
    const result = validateNewLead({
      draft: filled({ fullName: "  Anna Jensen ", email: " anna@example.com " }),
      dateText: "2026-10-07 14:30",
      columns: coreColumns,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.lead.fullName).toBe("Anna Jensen")
      expect(result.lead.email).toBe("anna@example.com")
      expect(result.lead.date).toBe("2026-10-07")
      expect(result.lead.time).toBe("14:30")
    }
  })

  it("requires name, email and phone, and a valid email", () => {
    const missing = validateNewLead({
      draft: filled({ fullName: " ", email: "", phone: "" }),
      dateText: "2026-10-07",
      columns: coreColumns,
    })
    expect(missing).toMatchObject({
      ok: false,
      errors: {
        fullName: "leadSheetFieldRequired",
        email: "leadSheetFieldRequired",
        phone: "leadSheetFieldRequired",
      },
    })

    const badEmail = validateNewLead({
      draft: filled({ email: "not-an-email" }),
      dateText: "2026-10-07",
      columns: coreColumns,
    })
    expect(badEmail).toMatchObject({ ok: false, errors: { email: "leadSheetEmailInvalid" } })
  })

  it("rejects an unreadable date", () => {
    const result = validateNewLead({
      draft: filled(),
      dateText: "yesterday-ish",
      columns: coreColumns,
    })
    expect(result).toMatchObject({ ok: false, errors: { date: "leadSheetDateInvalid" } })
  })

  it("enforces required custom columns of the template", () => {
    const columns = [
      ...coreColumns,
      custom("budget", "number", 5, { required: true }),
      custom("note", "text", 6),
      custom("roof", "select", 7, { required: true, options: ["Tile", "Metal"] }),
    ]
    const result = validateNewLead({
      draft: filled({ customFields: { note: "  ", budget: null } }),
      dateText: "2026-10-07",
      columns,
    })
    expect(result).toMatchObject({
      ok: false,
      errors: { budget: "leadSheetFieldRequired", roof: "leadSheetFieldRequired" },
    })
    if (!result.ok) expect(result.errors.note).toBeUndefined()
  })

  it("keeps filled custom values (including 0) and drops empty optional ones", () => {
    const columns = [
      ...coreColumns,
      custom("budget", "number", 5, { required: true }),
      custom("note", "text", 6),
      custom("photo", "image", 7),
    ]
    const result = validateNewLead({
      draft: filled({ customFields: { budget: 0, note: "", photo: { text: "", url: "" } } }),
      dateText: "2026-10-07",
      columns,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.lead.customFields).toEqual({ budget: 0 })
  })

  it("canonicalizes image links and flags broken ones", () => {
    const columns = [...coreColumns, custom("photo", "image", 5)]
    const ok = validateNewLead({
      draft: filled({ customFields: { photo: { text: " Front ", url: "example.com/a.jpg" } } }),
      dateText: "2026-10-07",
      columns,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.lead.customFields).toEqual({
        photo: { text: "Front", url: "https://example.com/a.jpg" },
      })
    }

    const broken = validateNewLead({
      draft: filled({ customFields: { photo: { text: "Front", url: "" } } }),
      dateText: "2026-10-07",
      columns,
    })
    expect(broken.ok).toBe(false)
  })

  it("edit mode accepts older leads with missing contact or required custom values", () => {
    const columns = [...coreColumns, custom("budget", "number", 5, { required: true })]
    const draft = filled({ phone: "", email: "" })

    expect(validateNewLead({ draft, dateText: "2026-10-07", columns }).ok).toBe(false)
    expect(validateNewLead({ draft, dateText: "2026-10-07", columns, mode: "edit" }).ok).toBe(true)
  })

  it("edit mode still rejects a filled but invalid email, date or image link", () => {
    const columns = [...coreColumns, custom("photo", "image", 5)]
    expect(
      validateNewLead({
        draft: filled({ email: "nope" }),
        dateText: "2026-10-07",
        columns,
        mode: "edit",
      })
    ).toMatchObject({ ok: false, errors: { email: "leadSheetEmailInvalid" } })
    expect(
      validateNewLead({ draft: filled(), dateText: "???", columns, mode: "edit" })
    ).toMatchObject({ ok: false, errors: { date: "leadSheetDateInvalid" } })
    expect(
      validateNewLead({
        draft: filled({ customFields: { photo: { text: "x", url: "" } } }),
        dateText: "2026-10-07",
        columns,
        mode: "edit",
      }).ok
    ).toBe(false)
  })

  it("does not require a date when the sheet has no date column", () => {
    const result = validateNewLead({
      draft: filled(),
      dateText: "2026-10-07 09:00",
      columns: coreColumns.filter((col) => !(col.kind === "builtin" && col.builtinKey === "date")),
    })
    expect(result.ok).toBe(true)
  })
})
