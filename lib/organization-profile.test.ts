import { describe, expect, it } from "vitest"

import {
  isOrganizationProfileComplete,
  parseOrganizationProfileBody,
} from "@/lib/organization-profile"
import type { OrganizationRow } from "@/lib/db/types"

const completeOrg: OrganizationRow = {
  id: "1",
  slug: "test",
  name: "Test ApS",
  logo_url: null,
  demo_mode: false,
  cvr: "12345678",
  address: "Gade 1",
  zip_code: "2100",
  city: "København",
  country: "DK",
  primary_contact_name: "Anna",
  primary_contact_email: "anna@test.dk",
  primary_contact_phone: "+4512345678",
  website_url: "https://example.com",
  created_at: "",
  updated_at: "",
}

describe("isOrganizationProfileComplete", () => {
  it("returns true when required fields are set", () => {
    expect(isOrganizationProfileComplete(completeOrg)).toBe(true)
  })

  it("returns false when contact email missing", () => {
    expect(
      isOrganizationProfileComplete({ ...completeOrg, primary_contact_email: "" })
    ).toBe(false)
  })
})

describe("parseOrganizationProfileBody", () => {
  it("accepts valid payload", () => {
    const result = parseOrganizationProfileBody({
      name: "Firma",
      primaryContactName: "Bo",
      primaryContactEmail: "bo@firma.dk",
      primaryContactPhone: "+45 12 34 56 78",
      address: "Vej 2",
      zipCode: "8000",
      city: "Aarhus",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.patch.name).toBe("Firma")
      expect(result.patch.zip_code).toBe("8000")
    }
  })

  it("rejects invalid CVR when provided", () => {
    const result = parseOrganizationProfileBody({
      name: "Firma",
      cvr: "123",
      primaryContactName: "Bo",
      primaryContactEmail: "bo@firma.dk",
      primaryContactPhone: "+45 12 34 56 78",
      address: "Vej 2",
      zipCode: "8000",
      city: "Aarhus",
    })
    expect(result.ok).toBe(false)
  })
})
