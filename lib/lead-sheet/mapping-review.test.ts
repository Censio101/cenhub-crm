import { describe, expect, it } from "vitest"

import {
  FUNNEL_TARGET_PREFIX,
  META_TARGET_PREFIX,
  findDanglingCustomTargets,
  findUnmappedColumns,
  formNeedsRemap,
  isMappingConfigured,
  mappingStatus,
} from "@/lib/lead-sheet/mapping-review"

const columns = [{ key: "budget" }, { key: "roof" }]

describe("findDanglingCustomTargets", () => {
  it("returns custom targets whose column no longer exists", () => {
    expect(
      findDanglingCustomTargets(
        { fullName: "name", "custom:budget": "q1", "custom:gone": "q2" },
        META_TARGET_PREFIX,
        ["budget"]
      )
    ).toEqual(["gone"])
  })

  it("supports the funnel prefix and ignores targets without a source", () => {
    expect(
      findDanglingCustomTargets(
        { "customFields.gone": "answers.x", "customFields.empty": "  " },
        FUNNEL_TARGET_PREFIX,
        []
      )
    ).toEqual(["gone"])
  })
})

describe("findUnmappedColumns", () => {
  it("lists columns without a mapped source", () => {
    expect(findUnmappedColumns({ "custom:budget": "q1" }, META_TARGET_PREFIX, columns)).toEqual([
      { key: "roof" },
    ])
  })
})

describe("formNeedsRemap", () => {
  const mapped = { fullName: "name" }

  it("ignores forms without any mapping", () => {
    expect(
      formNeedsRemap({ mapping: {}, changedAt: "2026-02-01", reviewedAt: null, danglingCount: 3 })
    ).toBe(false)
  })

  it("flags dangling targets regardless of dates", () => {
    expect(
      formNeedsRemap({
        mapping: mapped,
        changedAt: null,
        reviewedAt: "2026-02-01",
        danglingCount: 1,
      })
    ).toBe(true)
  })

  it("flags a sheet change after the last review", () => {
    expect(
      formNeedsRemap({
        mapping: mapped,
        changedAt: "2026-02-02T10:00:00Z",
        reviewedAt: "2026-02-01T10:00:00Z",
        danglingCount: 0,
      })
    ).toBe(true)
    expect(
      formNeedsRemap({
        mapping: mapped,
        changedAt: "2026-02-02",
        reviewedAt: null,
        danglingCount: 0,
      })
    ).toBe(true)
  })

  it("stays quiet once reviewed after the change, or when the sheet never changed", () => {
    expect(
      formNeedsRemap({
        mapping: mapped,
        changedAt: "2026-02-01T10:00:00Z",
        reviewedAt: "2026-02-02T10:00:00Z",
        danglingCount: 0,
      })
    ).toBe(false)
    expect(
      formNeedsRemap({ mapping: mapped, changedAt: null, reviewedAt: null, danglingCount: 0 })
    ).toBe(false)
  })
})

describe("mappingStatus", () => {
  it("combines dangling, unmapped and remap flags", () => {
    const status = mappingStatus({
      mapping: { fullName: "name", "custom:budget": "q1", "custom:gone": "q2" },
      prefix: META_TARGET_PREFIX,
      customFields: columns,
      changedAt: null,
      reviewedAt: null,
    })
    expect(status).toEqual({ needsRemap: true, dangling: ["gone"], unmapped: ["roof"] })
  })

  it("is quiet for a fully mapped, reviewed form", () => {
    const status = mappingStatus({
      mapping: { fullName: "name", "custom:budget": "q1", "custom:roof": "q2" },
      prefix: META_TARGET_PREFIX,
      customFields: columns,
      changedAt: "2026-01-01",
      reviewedAt: "2026-01-02",
    })
    expect(status).toEqual({ needsRemap: false, dangling: [], unmapped: [] })
  })
})

describe("isMappingConfigured", () => {
  it("requires at least one non-empty source", () => {
    expect(isMappingConfigured({})).toBe(false)
    expect(isMappingConfigured({ a: " " })).toBe(false)
    expect(isMappingConfigured({ a: "x" })).toBe(true)
  })
})
