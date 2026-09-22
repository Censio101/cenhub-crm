import { describe, expect, it } from "vitest"

import { getPerformanceDashboard } from "./get-performance"
import {
  chartMetrics,
  getMetric,
  kpiMetrics,
  tableMetrics,
  yearTotalsMetrics,
} from "./metrics"
import { SERVICES } from "./services"
import {
  dashboardStateToParams,
  parseDashboardParams,
} from "./url-state"

const ytd2026 = {
  start: new Date(2026, 0, 1),
  end: new Date(2026, 8, 21),
}

describe("service filter", () => {
  it("keeps all-services totals as the sum of each service", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const parts = SERVICES.map((service) =>
      getPerformanceDashboard({ range: ytd2026, service: service.id })
    )

    expect(parts.reduce((sum, part) => sum + part.current.totals.leads, 0)).toBe(
      all.current.totals.leads
    )
    expect(
      parts.reduce((sum, part) => sum + part.current.totals.revenue, 0)
    ).toBe(all.current.totals.revenue)
  })

  it("changes KPIs when filtering to a single service", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const roofing = getPerformanceDashboard({
      range: ytd2026,
      service: "tagdaekning",
    })

    expect(roofing.current.totals.revenue).toBeGreaterThan(0)
    expect(roofing.current.totals.revenue).toBeLessThan(
      all.current.totals.revenue
    )
    expect(roofing.current.totals.leads).toBeLessThan(all.current.totals.leads)
  })

  it("splits closed customers into B2B and B2C", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const b2b = all.current.totals.b2bCustomers ?? 0
    const b2c = all.current.totals.b2cCustomers ?? 0

    expect(b2b).toBeGreaterThan(0)
    expect(b2c).toBeGreaterThan(0)
    expect(b2b + b2c).toBe(all.current.totals.customers)
  })

  it("accumulates year totals from January onward", () => {
    const data = getPerformanceDashboard({ range: ytd2026 })
    const last = data.year.cumulativeBuckets.at(-1)
    const monthlyRevenue = data.year.monthlyBuckets.reduce(
      (sum, bucket) => sum + bucket.revenue,
      0
    )

    expect(data.year.year).toBe(2026)
    expect(data.year.monthlyBuckets).toHaveLength(12)
    expect(last?.revenue).toBe(monthlyRevenue)
    expect(data.year.cumulativeBuckets[0]?.revenue).toBe(
      data.year.monthlyBuckets[0]?.revenue
    )
    expect(data.year.cumulativeBuckets[1]?.revenue).toBe(
      (data.year.monthlyBuckets[0]?.revenue ?? 0) +
        (data.year.monthlyBuckets[1]?.revenue ?? 0)
    )
  })

  it("keeps monthly and year tables on the requested metrics", () => {
    expect(tableMetrics().map((metric) => metric.id)).toEqual([
      "revenue",
      "profit",
      "leads",
      "customers",
      "closeRate",
      "ltv",
    ])
    expect(yearTotalsMetrics().map((metric) => metric.id)).toEqual([
      "revenue",
      "profit",
      "leads",
      "customers",
      "closeRate",
      "ltv",
    ])
    expect(yearTotalsMetrics()[0]?.label).toBe("Omsætning")
    expect(getMetric("customers").label).toBe("Lukkede kunder")
  })

  it("orders KPI cards and chart pills independently of table rows", () => {
    const kpiOrder = [
      "revenue",
      "profit",
      "ltv",
      "customers",
      "leads",
      "cac",
      "cpl",
      "adSpend",
      "closeRate",
    ]
    expect(kpiMetrics().map((metric) => metric.id)).toEqual(kpiOrder)
    expect(chartMetrics().map((metric) => metric.id)).toEqual(kpiOrder)
    expect(kpiMetrics().map((metric) => metric.label)).toEqual([
      "Omsætning",
      "Bundlinje POAS",
      "LTV",
      "Lukkede kunder",
      "Leads",
      "CAC",
      "CPL",
      "Annoncebudget",
      "Close rate",
    ])
  })

  it("reads and writes the service URL parameter", () => {
    const parsed = parseDashboardParams(
      new URLSearchParams("service=badevaerelse&preset=ytd")
    )
    expect(parsed.service).toBe("badevaerelse")

    const query = dashboardStateToParams({
      ...parsed,
      service: "renovering",
    })
    expect(new URLSearchParams(query).get("service")).toBe("renovering")

    const allServices = dashboardStateToParams({
      ...parsed,
      service: null,
    })
    expect(new URLSearchParams(allServices).get("service")).toBeNull()
  })

  it("filters KPIs by B2B and B2C", () => {
    const all = getPerformanceDashboard({ range: ytd2026 })
    const b2b = getPerformanceDashboard({ range: ytd2026, segment: "b2b" })
    const b2c = getPerformanceDashboard({ range: ytd2026, segment: "b2c" })

    expect(b2b.current.totals.customers).toBe(all.current.totals.b2bCustomers)
    expect(b2c.current.totals.customers).toBe(all.current.totals.b2cCustomers)
    expect(
      b2b.current.totals.customers + b2c.current.totals.customers
    ).toBe(all.current.totals.customers)
    expect(b2b.current.totals.revenue).toBeGreaterThan(0)
    expect(b2b.current.totals.revenue).toBeLessThan(all.current.totals.revenue)
    expect(b2b.current.totals.revenue + b2c.current.totals.revenue).toBeCloseTo(
      all.current.totals.revenue,
      5
    )
  })

  it("reads and writes the segment URL parameter", () => {
    const parsed = parseDashboardParams(
      new URLSearchParams("segment=b2b&preset=ytd")
    )
    expect(parsed.segment).toBe("b2b")

    const query = dashboardStateToParams({
      ...parsed,
      segment: "b2c",
    })
    expect(new URLSearchParams(query).get("segment")).toBe("b2c")

    const allSegments = dashboardStateToParams({
      ...parsed,
      segment: null,
    })
    expect(new URLSearchParams(allSegments).get("segment")).toBeNull()
  })
})
