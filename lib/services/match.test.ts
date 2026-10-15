import { describe, expect, it } from "vitest"

import { foldServiceMatchKey } from "@/lib/services/fold-match-key"
import { matchService, matchServices } from "@/lib/services/match"
import type { ClientService } from "@/lib/services/types"

const SERVICES: ClientService[] = [
  {
    id: "renovering",
    nameDa: "Renovering",
    nameEn: "Renovation",
    source: "manual",
    categoryNames: [],
  },
]

describe("matchService with aliases", () => {
  it("prefers org alias map over unknown labels", () => {
    const aliasToSlug = new Map([[foldServiceMatchKey("Excel label"), "renovering"]])
    expect(matchService("Excel label", SERVICES, aliasToSlug)?.id).toBe("renovering")
  })

  it("falls back to slug and names when no alias", () => {
    expect(matchService("Renovering", SERVICES)?.id).toBe("renovering")
  })
})

describe("matchServices", () => {
  it("collects unknown values", () => {
    const aliasToSlug = new Map([[foldServiceMatchKey("Ydelse A"), "renovering"]])
    const result = matchServices(["Ydelse A", "Missing"], SERVICES, aliasToSlug)
    expect(result.ids).toEqual(["renovering"])
    expect(result.unknown).toEqual(["Missing"])
  })
})
