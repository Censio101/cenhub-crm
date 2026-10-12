import { describe, expect, it } from "vitest"

import { applyWonDateForStatusChange, wonDateForNewLead } from "./won-date"

describe("won-date", () => {
  const now = new Date("2026-10-12T12:00:00Z")

  it("sets won date when status becomes won", () => {
    expect(applyWonDateForStatusChange("new_waiting_call", "won", null, now)).toBe("2026-10-12")
  })

  it("clears won date when leaving won", () => {
    expect(applyWonDateForStatusChange("won", "lost", "2026-09-01", now)).toBe(null)
  })

  it("sets won date for new lead created as won", () => {
    expect(wonDateForNewLead("won", "2026-01-01", now)).toBe("2026-10-12")
  })
})
