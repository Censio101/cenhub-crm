import { describe, expect, it } from "vitest"

import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"

import {
  columnsForCompactProfile,
  filterColumnsForFormSourceProfile,
  formSourceFilterNarrowsColumns,
  funnelFormViewsToMap,
  promotePlatformColumnAfterPhone,
} from "@/lib/leads/funnel-sheet-column-profile"

const builtin = (key: string) =>
  ({ id: key, sortIndex: 0, kind: "builtin", builtinKey: key }) as LeadSheetTemplateColumn

const custom = (fieldKey: string) =>
  ({
    id: fieldKey,
    sortIndex: 0,
    kind: "custom",
    customField: {
      id: "c1",
      fieldKey,
      label: fieldKey,
      fieldType: "text",
      required: false,
      config: {},
    },
  }) as LeadSheetTemplateColumn

describe("formSourceFilterNarrowsColumns", () => {
  it("is false for null or empty targets", () => {
    expect(formSourceFilterNarrowsColumns(null)).toBe(false)
    expect(formSourceFilterNarrowsColumns([])).toBe(false)
  })

  it("is true for explicit subset", () => {
    expect(formSourceFilterNarrowsColumns(["leadDate", "fullName"])).toBe(true)
  })
})

describe("columnsForCompactProfile", () => {
  const cols = [
    builtin("date"),
    builtin("fullName"),
    builtin("address"),
    builtin("companyName"),
    builtin("metaAdId"),
    builtin("salesPrice"),
    builtin("status"),
    custom("build_year"),
    custom("note"),
  ]

  const targets = [
    "leadDate",
    "fullName",
    "email",
    "phone",
    "companyName",
    "customFields.note",
  ]

  it("keeps target-mapped columns and pipeline builtins", () => {
    const keys = columnsForCompactProfile(cols, targets).map((c) =>
      c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey
    )
    expect(keys).toEqual(["date", "fullName", "companyName", "salesPrice", "status", "note"])
  })

  it("always includes Platform (utm_source) when the funnel uses a compact subset", () => {
    const withPlatform = [...cols, custom("utm_source")]
    const keys = columnsForCompactProfile(withPlatform, targets).map((c) =>
      c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey
    )
    expect(keys).toContain("utm_source")
  })

  it("returns all columns when targets are missing", () => {
    expect(columnsForCompactProfile(cols, null)).toHaveLength(cols.length)
  })
})

describe("filterColumnsForFormSourceProfile", () => {
  const cols = [builtin("date"), builtin("address"), builtin("status"), custom("build_year")]

  const map = funnelFormViewsToMap([
    {
      label: "Quick-Heat Trailer",
      webhookFieldTargets: ["leadDate", "fullName"],
    },
    {
      label: "Beregning",
      webhookFieldTargets: null,
    },
  ])

  it("returns all columns when filter is all", () => {
    expect(filterColumnsForFormSourceProfile(cols, "all", map)).toHaveLength(4)
  })

  it("returns all columns when funnel uses all webhook fields", () => {
    expect(filterColumnsForFormSourceProfile(cols, "Beregning", map)).toHaveLength(4)
  })

  it("narrows columns when funnel webhook fields are a subset", () => {
    const keys = filterColumnsForFormSourceProfile(cols, "Quick-Heat Trailer", map).map((c) =>
      c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey
    )
    expect(keys).toEqual(["date", "status"])
  })
})

describe("promotePlatformColumnAfterPhone", () => {
  it("moves utm_source immediately after phone", () => {
    const cols = [
      builtin("date"),
      builtin("phone"),
      builtin("companyName"),
      custom("utm_source"),
    ]
    const keys = promotePlatformColumnAfterPhone(cols).map((c) =>
      c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey
    )
    expect(keys).toEqual(["date", "phone", "utm_source", "companyName"])
  })
})
