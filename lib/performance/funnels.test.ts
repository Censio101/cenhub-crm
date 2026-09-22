import { describe, expect, it } from "vitest"

import { FUNNELS } from "./funnels"
import { getPerformanceDashboard } from "./get-performance"
import { SERVICES } from "./services"
import {
  dashboardStateToParams,
  parseDashboardParams,
} from "./url-state"

const ytd2026 = {
  start: new Date(2026, 0, 1),
  end: new Date(2026, 8, 21),
}

describe("funnel filter", () => {
  it("keeps all-funnel totals as the sum of each funnel", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const parts = FUNNELS.map((funnel) =>
      getPerformanceDashboard({ range: ytd2026, funnel: funnel.id })
    )

    expect(parts.reduce((sum, part) => sum + part.current.totals.leads, 0)).toBe(
      all.current.totals.leads
    )
    expect(
      parts.reduce((sum, part) => sum + part.current.totals.revenue, 0)
    ).toBe(all.current.totals.revenue)
    expect(
      parts.reduce((sum, part) => sum + part.current.totals.customers, 0)
    ).toBe(all.current.totals.customers)
  })

  it("changes KPIs when filtering to a single funnel", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const meta = getPerformanceDashboard({ range: ytd2026, funnel: "meta" })
    const website = getPerformanceDashboard({
      range: ytd2026,
      funnel: "website",
    })

    expect(meta.current.totals.revenue).toBeGreaterThan(0)
    expect(meta.current.totals.revenue).toBeLessThan(all.current.totals.revenue)
    expect(website.current.totals.leads).toBeLessThan(all.current.totals.leads)
    expect(meta.current.totals.adSpend).toBeGreaterThan(
      website.current.totals.adSpend
    )
  })

  it("can combine funnel and service filters", () => {
    const meta = getPerformanceDashboard({ range: ytd2026, funnel: "meta" })
    const roofingMeta = getPerformanceDashboard({
      range: ytd2026,
      service: "tagdaekning",
      funnel: "meta",
    })

    expect(roofingMeta.current.totals.revenue).toBeGreaterThan(0)
    expect(roofingMeta.current.totals.revenue).toBeLessThan(
      meta.current.totals.revenue
    )
  })

  it("keeps service totals as the sum across funnels", () => {
    const roofing = getPerformanceDashboard({
      range: ytd2026,
      service: "tagdaekning",
    })
    const parts = FUNNELS.map((funnel) =>
      getPerformanceDashboard({
        range: ytd2026,
        service: "tagdaekning",
        funnel: funnel.id,
      })
    )

    expect(parts.reduce((sum, part) => sum + part.current.totals.leads, 0)).toBe(
      roofing.current.totals.leads
    )
  })

  it("still keeps all-services totals as the sum of each service", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const parts = SERVICES.map((service) =>
      getPerformanceDashboard({ range: ytd2026, service: service.id })
    )

    expect(parts.reduce((sum, part) => sum + part.current.totals.leads, 0)).toBe(
      all.current.totals.leads
    )
  })

  it("reads and writes the funnel URL parameter", () => {
    const parsed = parseDashboardParams(
      new URLSearchParams("funnel=landing&preset=ytd")
    )
    expect(parsed.funnel).toBe("landing")

    const query = dashboardStateToParams({
      ...parsed,
      funnel: "website",
    })
    expect(new URLSearchParams(query).get("funnel")).toBe("website")

    const allFunnels = dashboardStateToParams({
      ...parsed,
      funnel: null,
    })
    expect(new URLSearchParams(allFunnels).get("funnel")).toBeNull()
  })
})
