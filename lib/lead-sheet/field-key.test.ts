import { describe, expect, it } from "vitest"

import { isValidFieldKey, suggestFieldKey, uniqueFieldKey } from "@/lib/lead-sheet/field-key"

describe("suggestFieldKey", () => {
  it.each([
    ["Budget", "budget"],
    ["Størrelse", "stoerrelse"],
    ["Åbningstid", "aabningstid"],
    ["Ærinde", "aerinde"],
    ["Café Menu", "cafe_menu"],
    ["Preferred  time!", "preferred_time"],
    ["2nd visit", "f_2nd_visit"],
    ["  spaced  ", "spaced"],
  ])("turns %s into %s", (label, key) => {
    expect(suggestFieldKey(label)).toBe(key)
  })

  it("returns an empty string when nothing usable remains", () => {
    expect(suggestFieldKey("???")).toBe("")
    expect(suggestFieldKey("a")).toBe("")
    expect(suggestFieldKey("日本語")).toBe("")
  })

  it("caps the length without leaving a trailing underscore", () => {
    const key = suggestFieldKey(`${"word ".repeat(20)}end`)
    expect(key.length).toBeLessThanOrEqual(48)
    expect(key.endsWith("_")).toBe(false)
  })

  it("always produces a valid key when non-empty", () => {
    for (const label of ["Størrelse på hus", "Nr. 1", "__x__", "Ünïcödé Nàme"]) {
      const key = suggestFieldKey(label)
      if (key) expect(isValidFieldKey(key)).toBe(true)
    }
  })
})

describe("isValidFieldKey", () => {
  it("accepts snake_case English keys", () => {
    expect(isValidFieldKey("budget")).toBe(true)
    expect(isValidFieldKey("roof_type_2")).toBe(true)
  })

  it.each([
    "",
    "a",
    "Budget",
    "1abc",
    "has space",
    "størrelse",
    "dash-key",
    "__proto__",
    "constructor",
  ])("rejects %j", (key) => {
    expect(isValidFieldKey(key)).toBe(false)
  })
})

describe("uniqueFieldKey", () => {
  it("keeps a free key as is", () => {
    expect(uniqueFieldKey("budget", new Set())).toBe("budget")
  })

  it("adds a numeric suffix on collision", () => {
    expect(uniqueFieldKey("budget", new Set(["budget"]))).toBe("budget_2")
    expect(uniqueFieldKey("budget", new Set(["budget", "budget_2"]))).toBe("budget_3")
  })

  it("falls back to `column` for unusable input", () => {
    expect(uniqueFieldKey("???", new Set())).toBe("column")
    expect(uniqueFieldKey("???", new Set(["column"]))).toBe("column_2")
  })

  it("never returns a reserved key", () => {
    expect(uniqueFieldKey("constructor", new Set())).toBe("constructor_2")
  })

  it("keeps suffixed keys within the length limit", () => {
    const long = "a".repeat(48)
    const key = uniqueFieldKey(long, new Set([long]))
    expect(key.length).toBeLessThanOrEqual(48)
    expect(key.endsWith("_2")).toBe(true)
  })
})

describe("reserved field keys", () => {
  it("rejects names that clash with built-in or webhook fields", () => {
    for (const key of ["email", "phone", "status", "date", "platform"]) {
      expect(isValidFieldKey(key)).toBe(false)
    }
    expect(isValidFieldKey("budget")).toBe(true)
  })

  it("suggests a free key when the label is a reserved name", () => {
    expect(uniqueFieldKey(suggestFieldKey("Email"), new Set())).toBe("email_2")
  })
})
