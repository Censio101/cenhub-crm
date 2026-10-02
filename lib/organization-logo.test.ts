import { describe, expect, it } from "vitest"

import {
  organizationLogoObjectPath,
  resolveOrganizationLogoUrl,
} from "@/lib/organization-logo"

describe("resolveOrganizationLogoUrl", () => {
  it("returns null for empty values", () => {
    expect(resolveOrganizationLogoUrl(null)).toBeNull()
    expect(resolveOrganizationLogoUrl("")).toBeNull()
  })

  it("passes through absolute and static paths", () => {
    expect(resolveOrganizationLogoUrl("https://cdn.example/logo.png")).toBe(
      "https://cdn.example/logo.png"
    )
    expect(resolveOrganizationLogoUrl("/local.svg")).toBe("/local.svg")
  })

  it("builds public storage URL for object paths", () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    try {
      const url = resolveOrganizationLogoUrl("org-id/logo.png")
      expect(url).toBe(
        "https://example.supabase.co/storage/v1/object/public/organization-logos/org-id/logo.png"
      )
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prev
    }
  })
})

describe("organizationLogoObjectPath", () => {
  it("uses org id folder and sanitized extension", () => {
    expect(organizationLogoObjectPath("abc", "png")).toBe("abc/logo.png")
  })
})
