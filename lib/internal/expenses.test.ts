import { describe, expect, it } from "vitest"

import {
  coerceFixedExpense,
  expenseAmountInMonth,
  expenseMonthTotal,
  monthlyExpenseTotal,
  normalizeExpenses,
  typeTotal,
} from "@/lib/internal/expenses"

describe("fixed expenses", () => {
  it("keeps named subscriptions and sums them by type", () => {
    const lines = normalizeExpenses([
      { id: "a", type: "software", name: "AI", amount: 1000, startsOn: "2025-01-01" },
      { id: "b", type: "software", name: "Hosting", amount: 500, startsOn: "2025-01-01" },
      { id: "c", type: "marketing", name: "Meta ads", amount: 8000, startsOn: "2025-01-01" },
      { id: "d", type: "software", name: "  ", amount: 200, startsOn: "2025-01-01" },
      { id: "e", type: "marketing", name: "Ukendt", amount: -1, startsOn: "2025-01-01" },
    ])
    expect(lines.map((line) => line.name)).toEqual(["AI", "Hosting", "Meta ads"])
    expect(typeTotal("software", lines, 2025, 0)).toBe(1500)
    expect(typeTotal("marketing", lines, 2025, 0)).toBe(8000)
    expect(monthlyExpenseTotal(lines, new Date("2025-06-15"))).toBe(9500)
  })

  it("respects end date and price periods per month", () => {
    const line = coerceFixedExpense(
      {
        id: "x",
        type: "software",
        name: "Cursor",
        amount: 600,
        startsOn: "2025-01-01",
        endsOn: "2025-06-30",
        pricePeriods: [
          { id: "p1", from: "2025-01-01", to: "2025-03-31", amount: 500 },
          { id: "p2", from: "2025-04-01", to: "2025-06-30", amount: 600 },
        ],
      },
      "x"
    )
    expect(expenseAmountInMonth(line, 2025, 2)).toBe(500)
    expect(expenseAmountInMonth(line, 2025, 3)).toBe(600)
    expect(expenseAmountInMonth(line, 2025, 6)).toBe(0)
    expect(expenseMonthTotal([line], 2025, 2)).toBe(500)
    expect(expenseMonthTotal([line], 2025, 5)).toBe(600)
  })
})
