import { describe, expect, it } from "vitest"

import { matchService, matchServices, splitServiceText } from "@/lib/services/match"
import { resolveServices } from "@/lib/services/resolve"
import { uniqueServiceSlug } from "@/lib/services/slug"
import type { Service } from "@/lib/services/types"

const svc = (id: string, slug: string, nameDa: string, nameEn = nameDa): Service => ({
  id,
  slug,
  nameDa,
  nameEn,
  sortIndex: 0,
})

const library = [
  svc("s1", "tagdaekning", "Tagdækning", "Roofing"),
  svc("s2", "renovering", "Renovering", "Renovation"),
  svc("s3", "vvs", "VVS"),
  svc("s4", "el", "El"),
]
const construction = { id: "c1", nameDa: "Byggeri", nameEn: "Construction" }
const plumbing = { id: "c2", nameDa: "Blik", nameEn: "Plumbing" }

describe("resolveServices (opt-in)", () => {
  const links = [
    { categoryId: "c1", serviceId: "s1" },
    { categoryId: "c1", serviceId: "s2" },
    { categoryId: "c2", serviceId: "s2" },
    { categoryId: "c2", serviceId: "s3" },
  ]

  it("gives nothing for an assigned category until services are selected", () => {
    const result = resolveServices({
      library,
      assignedCategories: [construction, plumbing],
      links,
      selectedIds: [],
    })
    expect(result).toEqual([])
  })

  it("returns exactly the selected services, marking those from the client's sets", () => {
    const result = resolveServices({
      library,
      assignedCategories: [construction, plumbing],
      links,
      selectedIds: ["s2", "s4"],
    })
    expect(result.map((s) => [s.id, s.source])).toEqual([
      ["renovering", "category"],
      ["el", "manual"],
    ])
    expect(result[0].categoryNames.map((c) => c.en)).toEqual(["Construction", "Plumbing"])
  })

  it("returns the selected services in the order they were arranged", () => {
    const result = resolveServices({
      library,
      assignedCategories: [construction],
      links,
      selectedIds: ["s4", "s2", "s1"],
      customOrder: true,
    })
    expect(result.map((s) => s.id)).toEqual(["el", "renovering", "tagdaekning"])
  })

  it("defaults to the client's categories, then other categories, then manual", () => {
    const result = resolveServices({
      library,
      assignedCategories: [construction],
      links: [{ categoryId: "c1", serviceId: "s1" }],
      // s4 manual, s3 other category (not linked here), s1 in the client's category
      selectedIds: ["s4", "s3", "s1"],
      manualIds: ["s4"],
    })
    expect(result.map((s) => s.id)).toEqual(["tagdaekning", "vvs", "el"])
  })

  it("keeps a selected service when its category is removed from the client", () => {
    const result = resolveServices({
      library,
      assignedCategories: [],
      links,
      selectedIds: ["s1"],
    })
    expect(result.map((s) => [s.id, s.source])).toEqual([["tagdaekning", "manual"]])
  })
})

describe("matching and slugs", () => {
  const services = resolveServices({
    library,
    assignedCategories: [construction],
    links: library.map((s) => ({ categoryId: "c1", serviceId: s.id })),
    selectedIds: library.map((s) => s.id),
  })

  it("matches by slug or either language, ignoring case and accents", () => {
    expect(matchService("TAGDÆKNING", services)?.id).toBe("tagdaekning")
    expect(matchService("roofing", services)?.id).toBe("tagdaekning")
    expect(matchService("vvs", services)?.id).toBe("vvs")
    expect(matchService("unknown", services)).toBeUndefined()
  })

  it("splits free text and reports unknown words", () => {
    expect(splitServiceText("Tag; VVS, El|Nybyg")).toEqual(["Tag", "VVS", "El", "Nybyg"])
    expect(matchServices(["VVS", "vvs", "Moon"], services)).toEqual({
      ids: ["vvs"],
      unknown: ["Moon"],
    })
  })

  it("builds a valid unique slug", () => {
    expect(uniqueServiceSlug("Badeværelse & Køkken", new Set())).toBe("badevaerelse-koekken")
    expect(uniqueServiceSlug("VVS", new Set(["vvs"]))).toBe("vvs-2")
    expect(uniqueServiceSlug("A", new Set())).toMatch(/^[a-z0-9-]{2,64}$/)
  })
})
