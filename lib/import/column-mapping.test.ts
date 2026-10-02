import { describe, expect, it } from "vitest"

import {
  IMPORT_STANDARD_TARGETS,
  cleanMapping,
  suggestColumnMapping,
} from "@/lib/import/column-mapping"

const targets = [
  ...IMPORT_STANDARD_TARGETS.map((target) => ({ target })),
  { target: "customFields.budget", names: ["budget", "Budget (kr)"] },
]

describe("suggestColumnMapping", () => {
  it("matches Danish and English headers", () => {
    const mapping = suggestColumnMapping(
      [
        "Navn",
        "E-mail",
        "Telefon",
        "Dato",
        "Postnr",
        "By",
        "Ydelse",
        "Status",
        "Pris",
        "Budget (kr)",
      ],
      targets
    )
    expect(mapping).toEqual({
      fullName: ["Navn"],
      email: ["E-mail"],
      phone: ["Telefon"],
      date: ["Dato"],
      zipCode: ["Postnr"],
      city: ["By"],
      serviceIds: ["Ydelse"],
      status: ["Status"],
      salesPrice: ["Pris"],
      "customFields.budget": ["Budget (kr)"],
    })
  })

  it("combines first and last name when there is no single name column", () => {
    const mapping = suggestColumnMapping(["Fornavn", "Efternavn", "Mail"], targets)
    expect(mapping.fullName).toEqual(["Fornavn", "Efternavn"])
    expect(mapping.email).toEqual(["Mail"])
  })

  it("uses each header once", () => {
    const mapping = suggestColumnMapping(["Name"], targets)
    expect(Object.values(mapping).flat()).toEqual(["Name"])
  })
})

describe("cleanMapping", () => {
  it("drops columns that are not in the file", () => {
    expect(cleanMapping({ fullName: ["A", "Gone"], email: ["Gone"] }, ["A"])).toEqual({
      fullName: ["A"],
    })
  })
})
