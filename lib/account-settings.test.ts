import { describe, expect, it } from "vitest"

import { ALL_SERVICE_IDS } from "@/lib/performance/services"
import {
  addEnabledServiceId,
  createCustomService,
  parseCustomServices,
  parseEnabledServiceIds,
  parseHvidbjergPartner,
  removeEnabledServiceId,
} from "@/lib/account-settings"

describe("enabled company services", () => {
  it("defaults to every preset when the stored value is missing", () => {
    expect(parseEnabledServiceIds(undefined)).toEqual(ALL_SERVICE_IDS)
    expect(parseEnabledServiceIds(null)).toEqual(ALL_SERVICE_IDS)
  })

  it("keeps an empty list when the customer has removed every service", () => {
    expect(parseEnabledServiceIds([])).toEqual([])
  })

  it("drops unknown ids and keeps the stored order", () => {
    expect(
      parseEnabledServiceIds(["badevaerelse", "unknown", "renovering"])
    ).toEqual(["badevaerelse", "renovering"])
  })

  it("keeps custom service ids that are defined", () => {
    expect(
      parseEnabledServiceIds(
        ["renovering", "koekken", "unknown"],
        [{ id: "koekken", label: "Køkken" }]
      )
    ).toEqual(["renovering", "koekken"])
  })

  it("parses custom services and skips presets or empty rows", () => {
    expect(
      parseCustomServices([
        { id: "koekken", label: "Køkken" },
        { id: "renovering", label: "Renovering" },
        { id: " ", label: "Tom" },
        { id: "gulv", label: "" },
      ])
    ).toEqual([{ id: "koekken", label: "Køkken" }])
  })

  it("creates a unique custom service id from the label", () => {
    const first = createCustomService("Køkken", [])
    expect(first).toEqual({ id: "koekken", label: "Køkken" })
    expect(createCustomService("Køkken", [first]).id).toBe("koekken-2")
  })

  it("does not add duplicates or unknown ids", () => {
    const current = ["renovering", "nybyg"] as const
    expect(addEnabledServiceId(current, "renovering")).toEqual(["renovering", "nybyg"])
    expect(addEnabledServiceId(current, "not-a-service")).toEqual([
      "renovering",
      "nybyg",
    ])
    expect(addEnabledServiceId(current, "tagdaekning")).toEqual([
      "renovering",
      "tagdaekning",
      "nybyg",
    ])
  })

  it("removes a service without rewriting the rest", () => {
    expect(
      removeEnabledServiceId(["renovering", "badevaerelse"], "badevaerelse")
    ).toEqual(["renovering"])
  })
})

describe("hvidbjerg partner certification", () => {
  it("defaults to on when the stored value is missing", () => {
    expect(parseHvidbjergPartner(undefined)).toBe(true)
    expect(parseHvidbjergPartner(null)).toBe(true)
  })

  it("keeps an explicit off value", () => {
    expect(parseHvidbjergPartner(false)).toBe(false)
  })
})
