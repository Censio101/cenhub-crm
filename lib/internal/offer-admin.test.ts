import { describe, expect, it } from "vitest"

import {
  filterOffersByQuery,
  offerContentTagIds,
  partitionOffers,
} from "@/lib/internal/offer-admin"
import type { Offer } from "@/lib/onboarding/types"

function sampleOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer_1",
    slug: "test-1",
    status: "draft",
    workspaceId: null,
    companyName: "JSV BYG ApS",
    contactName: "Jens Svendsen",
    email: "jens@jsv.dk",
    phone: "30 33 33 10",
    cvr: "12345678",
    packages: ["vaekstpakke"],
    publicPackageView: "both",
    services: ["hjemmeside"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sentAt: null,
    acceptedAt: null,
    acceptedVia: null,
    signatureName: null,
    ...overrides,
  }
}

describe("partitionOffers", () => {
  it("splits by status", () => {
    const offers = [
      sampleOffer({ id: "1", status: "draft" }),
      sampleOffer({ id: "2", status: "sent" }),
      sampleOffer({ id: "3", status: "accepted" }),
    ]
    const parts = partitionOffers(offers)
    expect(parts.drafts).toHaveLength(1)
    expect(parts.sent).toHaveLength(1)
    expect(parts.accepted).toHaveLength(1)
  })
})

describe("filterOffersByQuery", () => {
  it("matches phone with spaces when query uses digits", () => {
    const offers = [sampleOffer()]
    expect(filterOffersByQuery(offers, "30333310")).toHaveLength(1)
    expect(filterOffersByQuery(offers, "999")).toHaveLength(0)
  })

  it("matches company name", () => {
    const offers = [sampleOffer()]
    expect(filterOffersByQuery(offers, "jsv byg")).toHaveLength(1)
  })
})

describe("offerContentTagIds", () => {
  it("includes meta when a package is selected", () => {
    const ids = offerContentTagIds({ packages: ["vaekstpakke"], services: [] })
    expect(ids).toContain("meta")
  })

  it("includes selected services", () => {
    const ids = offerContentTagIds({
      packages: ["vaekstpakke"],
      services: ["google", "hjemmeside"],
    })
    expect(ids).toEqual(expect.arrayContaining(["meta", "google", "hjemmeside"]))
  })
})
