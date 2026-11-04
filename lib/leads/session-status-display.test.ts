import { describe, expect, it } from "vitest"
import {
  formatSessionStatusDisplay,
  isSessionStatusAbandoned,
  isSessionStatusFieldKey,
  normalizeSessionStatusInCustomFields,
  normalizeSessionStatusStoredValue,
  sessionStatusValuesEqual,
} from "./session-status-display"

describe("session-status-display", () => {
  it("recognizes field key", () => {
    expect(isSessionStatusFieldKey("session_status")).toBe(true)
    expect(isSessionStatusFieldKey("Session_Status")).toBe(true)
    expect(isSessionStatusFieldKey("other")).toBe(false)
  })

  it("detects abandoned tokens", () => {
    for (const v of ["Ja", "ja", "abandoned", "afbrudt", "yes", "true"]) {
      expect(isSessionStatusAbandoned(v)).toBe(true)
      expect(formatSessionStatusDisplay(v)).toBe("Abandoned")
    }
  })

  it("defaults non-abandoned to Nej", () => {
    for (const v of ["", null, undefined, "Nej", "nej", "no", "false", "0", "completed"]) {
      expect(isSessionStatusAbandoned(v)).toBe(false)
      expect(formatSessionStatusDisplay(v)).toBe("Nej")
    }
  })

  it("equates abandoned variants for select UI", () => {
    expect(sessionStatusValuesEqual("Ja", "abandoned")).toBe(true)
    expect(sessionStatusValuesEqual("Nej", "nej")).toBe(true)
    expect(sessionStatusValuesEqual("Ja", "Nej")).toBe(false)
  })

  it("stores canonical abandoned / nej", () => {
    expect(normalizeSessionStatusStoredValue("Ja")).toBe("abandoned")
    expect(normalizeSessionStatusStoredValue("abandoned")).toBe("abandoned")
    expect(normalizeSessionStatusStoredValue("Nej")).toBe("nej")
    expect(normalizeSessionStatusStoredValue("")).toBe(null)
    expect(normalizeSessionStatusInCustomFields({ session_status: "Ja" })).toEqual({
      session_status: "abandoned",
    })
  })
})
