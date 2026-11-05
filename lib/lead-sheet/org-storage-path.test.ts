import { describe, expect, it } from "vitest"

import { isOrgStoragePath } from "@/lib/lead-sheet/org-storage-path"

const org = "d632ea82-ecc5-4d81-96c9-f1abfecd334f"

describe("isOrgStoragePath", () => {
  it("accepts a file stored under this organization", () => {
    expect(isOrgStoragePath(`${org}/lead/field/file.jpg`, org)).toBe(true)
  })

  it("rejects another organization, traversal, and remote urls", () => {
    expect(isOrgStoragePath("other-org/lead/file.jpg", org)).toBe(false)
    expect(isOrgStoragePath(`${org}/../other/file.jpg`, org)).toBe(false)
    expect(isOrgStoragePath(`https://files.example/${org}/file.jpg`, org)).toBe(false)
  })
})
