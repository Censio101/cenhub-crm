import { describe, expect, it } from "vitest"

import { describeCustomerChanges, describeLineChanges, filterAuditLogs } from "@/lib/onboarding/audit"
import type { CommercialLine } from "@/lib/onboarding/types"
import type { AuditLog } from "@/lib/onboarding/types"

const logs: AuditLog[] = [
  {
    id: "log_1",
    at: "2026-09-01T10:00:00.000Z",
    userId: "user-a",
    userName: "Kaj Eli Joensen",
    action: "Profil",
    target: "Kaj Eli Joensen",
    change: "Stilling: CEO → Founder",
  },
  {
    id: "log_2",
    at: "2026-09-20T10:00:00.000Z",
    userId: "user-b",
    userName: "Anna Admin",
    action: "Kunde",
    target: "Aaby El",
    change: "Kontakt, virksomhed og e-mail er gemt.",
  },
]

describe("audit change text", () => {
  it("names the customer fields that changed", () => {
    const change = describeCustomerChanges(
      {
        name: "Aaby El",
        email: "a@el.dk",
        contactName: "Anna",
        phone: "20 10 10 10",
        subEmail: "",
        cvr: "",
        website: "",
      },
      {
        name: "Aaby El",
        email: "a@el.dk",
        contactName: "Anna",
        phone: "20 10 10 11",
        subEmail: "",
        cvr: "12345678",
        website: "",
      }
    )
    expect(change).toBe("Telefon: 20 10 10 10 → 20 10 10 11. CVR: , → 12345678")
  })

  it("names added, removed and adjusted services", () => {
    const base: CommercialLine = {
      id: "line_1",
      workspaceId: "ws",
      category: "website",
      name: "Hjemmeside",
      amount: 1200,
      cadence: "monthly",
      startsOn: "2026-01-01",
      endsOn: null,
      note: "kystens.dk",
      billingPeriods: [],
    }
    const change = describeLineChanges(
      [base],
      [
        { ...base, amount: 1500 },
        {
          ...base,
          id: "line_2",
          name: "Hosting",
          category: "hosting",
          amount: 200,
          note: "",
        },
      ]
    )
    expect(change).toContain("Hjemmeside: 1.200 kr. → 1.500 kr.")
    expect(change).toContain("Tilføjede Hosting 200 kr. pr. md.")
  })
})

describe("audit log search", () => {
  it("filters by user, date and what changed", () => {
    expect(filterAuditLogs(logs, { userId: "user-b" }).map((log) => log.id)).toEqual(["log_2"])
    expect(filterAuditLogs(logs, { from: "2026-09-10", to: "2026-09-30" }).map((log) => log.id)).toEqual([
      "log_2",
    ])
    expect(filterAuditLogs(logs, { q: "stilling" }).map((log) => log.id)).toEqual(["log_1"])
    expect(filterAuditLogs(logs, { q: "aaby" }).map((log) => log.id)).toEqual(["log_2"])
  })
})
