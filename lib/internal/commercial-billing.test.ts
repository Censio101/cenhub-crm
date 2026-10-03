import { describe, expect, it } from "vitest"

import {
  commercialAmountInMonth,
  normalizeCommercialLine,
} from "@/lib/internal/commercial-billing"

describe("commercial billing periods", () => {
  it("applies different monthly amounts by period", () => {
    const line = normalizeCommercialLine(
      {
        workspaceId: "ws-1",
        id: "line-1",
        category: "marketing",
        name: "Meta ads",
        cadence: "monthly",
        amount: 6000,
        startsOn: "2026-01-01",
        endsOn: null,
        note: "",
        billingPeriods: [
          { id: "p1", from: "2026-01-01", to: "2026-03-31", amount: 5000, note: "Startniveau" },
          { id: "p2", from: "2026-04-01", to: "2026-05-31", amount: 0, note: "Pause" },
          { id: "p3", from: "2026-06-01", to: null, amount: 7500, note: "Højere mediebudget" },
        ],
      },
      "line-1"
    )

    expect(commercialAmountInMonth(line, 2026, 2)).toBe(5000)
    expect(commercialAmountInMonth(line, 2026, 3)).toBe(0)
    expect(commercialAmountInMonth(line, 2026, 5)).toBe(7500)
    expect(line.amount).toBe(7500)
  })
})
