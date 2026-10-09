import { describe, expect, it } from "vitest"

import type { Lead } from "@/lib/leads"

import { chartYearsFromData } from "./chart-years"

function lead(date: string): Lead {
  return {
    id: "1",
    date,
    fullName: "A",
    email: "",
    phone: "",
    segment: "b2c",
    companyName: "",
    address: "",
    zipCode: "",
    city: "",
    serviceIds: [],
    platform: "",
    metaAdId: "",
    status: "new_waiting_call",
    salesPrice: null,
    profit: null,
  }
}

describe("chartYearsFromData", () => {
  it("returns sorted years from leads and ad spend keys", () => {
    const years = chartYearsFromData(
      [lead("2025-11-01"), lead("2026-03-01")],
      { "2024-06": 100 }
    )
    expect(years).toEqual([2024, 2025, 2026])
  })
})
