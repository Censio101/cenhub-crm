import { describe, expect, it } from "vitest"

import { buildInternalOverview, serviceCashflow } from "@/lib/internal/metrics"
import type { CommercialLine, Workspace } from "@/lib/onboarding/types"

const now = new Date(2026, 8, 25)

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "ws-kyst",
    name: "Kystens Murer",
    email: "kontakt@kystens.dk",
    logo: "",
    profileImage: "",
    enabledServiceIds: [],
    customServices: [],
    hvidbjergPartner: false,
    status: "active",
    useDemoData: false,
    createdAt: "2025-03-01T00:00:00.000Z",
    provisionedAt: "2025-03-01T00:00:00.000Z",
    ...overrides,
  }
}

function line(overrides: Partial<CommercialLine> = {}): CommercialLine {
  return {
    id: "line-1",
    workspaceId: "ws-kyst",
    category: "marketing",
    name: "Meta annoncering",
    amount: 5000,
    cadence: "monthly",
    startsOn: "2026-01-01",
    endsOn: null,
    note: "",
    billingPeriods: [],
    ...overrides,
  }
}

describe("buildInternalOverview", () => {
  it("counts active monthly lines as MRR and one-time sales in their month", () => {
    const overview = buildInternalOverview({
      now,
      year: 2026,
      workspaces: [workspace()],
      lines: [
        line(),
        line({
          id: "line-web",
          category: "website",
          name: "Ny hjemmeside",
          amount: 25000,
          cadence: "once",
          startsOn: "2026-04-12",
        }),
      ],
    })

    expect(overview.kpis.mrr).toBe(5000)
    expect(overview.kpis.monthRevenue).toBe(5000)
    expect(overview.months[3]?.revenue).toBe(30000)
    expect(overview.months[3]?.cumulative).toBe(45000)
    expect(overview.months[11]?.cumulative).toBe(85000)
    expect(overview.customers[0]?.value).toBe(70000)
    expect(overview.customers[0]?.missing).toEqual([
      "seo",
      "geo",
      "hosting",
      "support",
    ])
  })

  it("drops ended subscriptions and ignores the demo workspace", () => {
    const overview = buildInternalOverview({
      now,
      year: 2026,
      workspaces: [
        workspace(),
        workspace({
          id: "ws-nordkystens",
          name: "Nordkystens Tømrer",
          useDemoData: true,
        }),
      ],
      lines: [
        line({ endsOn: "2026-08-31" }),
        line({
          id: "line-demo",
          workspaceId: "ws-nordkystens",
          amount: 90000,
        }),
      ],
    })

    expect(overview.kpis.mrr).toBe(0)
    expect(overview.customers).toHaveLength(1)
    expect(overview.months[7]?.revenue).toBe(5000)
    expect(overview.months[8]?.revenue).toBe(0)
  })

  it("includes awaiting_start workspaces in pipeline with future start metrics", () => {
    const overview = buildInternalOverview({
      now: new Date("2026-03-01T12:00:00"),
      year: 2026,
      workspaces: [
        workspace({ id: "ws-plan", name: "Planlagt VVS", status: "awaiting_start" }),
      ],
      lines: [
        line({
          id: "line-plan",
          workspaceId: "ws-plan",
          amount: 4000,
          startsOn: "2026-06-01",
        }),
      ],
    })

    expect(overview.pendingCustomers).toHaveLength(1)
    expect(overview.pendingCustomers[0]?.pipelineKind).toBe("awaiting_start")
    expect(overview.pendingCustomers[0]?.expectedMrr).toBe(4000)
    expect(overview.pendingCustomers[0]?.gapUntilStart).toBe(12000)
  })

  it("keeps pending customers out of MRR and reports their revenue as missing", () => {
    const overview = buildInternalOverview({
      now,
      year: 2026,
      workspaces: [
        workspace(),
        workspace({ id: "ws-venter", name: "Venter El", status: "pending" }),
      ],
      lines: [
        line(),
        line({ id: "line-wait", workspaceId: "ws-venter", amount: 3000 }),
      ],
    })

    expect(overview.kpis.mrr).toBe(5000)
    expect(overview.kpis.pendingRevenue).toBe(3000)
    expect(overview.pendingCustomers.map((customer) => customer.name)).toEqual(["Venter El"])
    expect(overview.serviceMonths.find((row) => row.category === "marketing")?.values[0]).toBe(5000)
  })

  it("uses workspace creation when the customer has no purchases yet", () => {
    const overview = buildInternalOverview({
      now,
      year: 2026,
      workspaces: [workspace()],
      lines: [],
    })

    expect(overview.customers[0]?.customerSince).toBe("2025-03-01")
    expect(overview.customers[0]?.tenureMonths).toBe(18)
    expect(overview.customers[0]?.missing).toHaveLength(6)
    expect(overview.kpis.averageValue).toBe(0)
  })

  it("splits cashflow and counts marketing customers without demo or pending", () => {
    const overview = buildInternalOverview({
      now,
      year: 2026,
      workspaces: [
        workspace(),
        workspace({ id: "ws-seo", name: "Kun SEO" }),
        workspace({ id: "ws-venter", name: "Venter El", status: "pending" }),
        workspace({ id: "ws-nordkystens", name: "Nordkystens Tømrer", useDemoData: true }),
      ],
      lines: [
        line({ name: "Marketing Meta ads", amount: 4000 }),
        line({
          id: "line-google",
          name: "Google ads",
          amount: 3000,
        }),
        line({ id: "line-seo", category: "seo", name: "SEO", amount: 2000 }),
        line({ id: "line-geo", category: "geo", name: "GEO", amount: 1500 }),
        line({
          id: "line-home",
          category: "website",
          name: "Hjemmeside hosting",
          amount: 800,
        }),
        line({
          id: "line-shop",
          category: "hosting",
          name: "Webshop hosting",
          amount: 1200,
        }),
        line({ id: "line-support", category: "support", name: "Support pakke", amount: 600 }),
        line({ id: "line-seo-only", workspaceId: "ws-seo", category: "seo", name: "SEO", amount: 900 }),
        line({ id: "line-wait", workspaceId: "ws-venter", name: "Marketing Meta ads", amount: 9000 }),
        line({ id: "line-demo", workspaceId: "ws-nordkystens", name: "Marketing Meta ads", amount: 90000 }),
      ],
    })

    expect(overview.cashflow).toMatchObject({
      subscription: 4000 + 3000 + 2000 + 1500 + 800 + 1200 + 600 + 900,
      meta: 4000,
      google: 3000,
      seoGeo: 2000 + 1500 + 900,
      hosting: 800 + 1200,
      support: 600,
      marketingCustomers: 1,
    })
    expect(overview.kpis.yearRevenue).toBe(overview.cashflow.subscription * 12)

    const past = serviceCashflow(
      [
        line({
          name: "Support pakke",
          category: "support",
          startsOn: "2025-01-01",
          endsOn: "2025-12-31",
          amount: 700,
        }),
      ],
      2025,
      "2026-09-25"
    )
    expect(past.asOf).toBe("2025-12-31")
    expect(past.subscription).toBe(700)
    expect(past.support).toBe(700)
    expect(past.meta).toBe(0)
  })
})
