import { describe, expect, it } from "vitest"

import type { ClientService } from "@/lib/services/types"
import { buildImportLead } from "@/lib/import/import-row"
import { readMapped } from "@/lib/import/read-mapped"
import type { ImportOptions } from "@/lib/import/types"
import type { LeadSheetCustomFieldDef } from "@/lib/lead-sheet/types"

const options: ImportOptions = {
  defaultStatus: "new_waiting_call",
  defaultPlatform: "website",
  skipDuplicates: true,
}

const budget: LeadSheetCustomFieldDef = {
  id: "1",
  fieldKey: "budget",
  label: "Budget",
  fieldType: "number",
  required: false,
  config: {},
}

const mapping = {
  fullName: ["Fornavn", "Efternavn"],
  email: ["Mail"],
  phone: ["Tlf"],
  date: ["Dato"],
  status: ["Status"],
  salesPrice: ["Pris"],
  serviceIds: ["Ydelse"],
  "customFields.budget": ["Budget"],
}

const SERVICES_FIXTURE: ClientService[] = [
  {
    id: "renovering",
    nameDa: "Renovering",
    nameEn: "Renovation",
    source: "manual",
    categoryNames: [],
  },
  {
    id: "tagdaekning",
    nameDa: "Tagdækning",
    nameEn: "Roofing",
    source: "manual",
    categoryNames: [],
  },
]

function build(row: Record<string, string | number | null>) {
  return buildImportLead({
    row,
    mapping,
    options,
    customFieldDefs: [budget],
    services: SERVICES_FIXTURE,
    today: "2026-09-30",
  })
}

describe("buildImportLead", () => {
  it("builds a lead from a Danish sheet row", () => {
    const result = build({
      Fornavn: "Jane",
      Efternavn: "Doe",
      Mail: " Jane@Example.dk ",
      Tlf: 12345678,
      Dato: 45000.5,
      Status: "Vundet",
      Pris: "12.500,50",
      Ydelse: "Tagdækning",
      Budget: "5 000",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.lead).toMatchObject({
      fullName: "Jane Doe",
      email: "jane@example.dk",
      phone: "12345678",
      date: "2023-03-15",
      time: "12:00",
      status: "won",
      salesPrice: 12500.5,
      serviceIds: ["tagdaekning"],
      platform: "website",
      source: "import",
      customFields: { budget: 5000 },
    })
    expect(result.warnings).toEqual([])
    expect(result.changes.map((c) => c.field)).toEqual(
      expect.arrayContaining(["fullName", "date", "status", "salesPrice", "serviceIds"])
    )
  })

  it("skips a row without name, email or phone", () => {
    expect(build({ Pris: "100", Ydelse: "Nybyg" })).toEqual({ ok: false, reason: "no_contact" })
  })

  it("keeps the lead and warns about cells it cannot read", () => {
    const result = build({
      Fornavn: "Jane",
      Mail: "not-an-email",
      Dato: "someday",
      Status: "maybe",
      Pris: "lots",
      Ydelse: "Mystery",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.lead).toMatchObject({
      date: "2026-09-30",
      status: "new_waiting_call",
      salesPrice: null,
    })
    expect(result.warnings.map((w) => w.field).sort()).toEqual(
      ["date", "email", "salesPrice", "serviceIds", "status"].sort()
    )
  })

  it("does not warn about a date when no date column is mapped", () => {
    const result = buildImportLead({
      row: { Fornavn: "Jane" },
      mapping: { fullName: ["Fornavn"] },
      options,
      customFieldDefs: [],
      services: SERVICES_FIXTURE,
      today: "2026-09-30",
    })
    expect(result.ok && result.warnings).toEqual([])
  })
})

describe("readMapped", () => {
  it("joins names and takes the first filled column otherwise", () => {
    expect(
      readMapped({ A: "Jane", B: "", C: "Doe" }, { fullName: ["A", "B", "C"] }, "fullName")
    ).toBe("Jane Doe")
    expect(readMapped({ A: "", B: "x" }, { city: ["A", "B"] }, "city")).toBe("x")
    expect(readMapped({}, {}, "city")).toBeNull()
  })
})
