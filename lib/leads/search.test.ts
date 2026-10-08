import { describe, expect, it } from "vitest"

import { matchesSearch } from "@/lib/leads/search"

describe("matchesSearch", () => {
  it("matches everything for an empty query", () => {
    expect(matchesSearch(["Anna"], "  ")).toBe(true)
  })

  it("is case-insensitive and matches any field", () => {
    expect(matchesSearch(["Anna Jensen", "anna@example.dk"], "JENSEN")).toBe(true)
    expect(matchesSearch(["Anna Jensen", "anna@example.dk"], "example.dk")).toBe(true)
    expect(matchesSearch(["Anna Jensen"], "peter")).toBe(false)
  })

  it("finds phone numbers regardless of spacing", () => {
    expect(matchesSearch(["+45 20 11 22 33"], "20112233")).toBe(true)
    expect(matchesSearch(["+4520112233"], "20 11 22")).toBe(true)
    expect(matchesSearch(["+45 20 11 22 33"], "99")).toBe(false)
  })

  it("keeps Danish letters intact", () => {
    expect(matchesSearch(["Søren Østergaard"], "østerg")).toBe(true)
  })

  it("ignores empty fields", () => {
    expect(matchesSearch([null, undefined, ""], "a")).toBe(false)
  })
})
