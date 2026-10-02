import { describe, expect, it } from "vitest"

import { getByPath } from "@/lib/leads/source-path"
import { MAX_PAYLOAD_PATHS, flattenPayloadPaths, suggestMappings } from "@/lib/leads/payload-paths"

describe("flattenPayloadPaths", () => {
  const body = {
    name: "Jane Doe",
    contact: { email: "jane@x.dk", "First Name": "Jane", "e.mail": "j@x.dk" },
    tags: ["roof", "window"],
    answers: [{ q: "size", a: "120" }],
    note: "",
    age: 41,
    optin: true,
    nothing: null,
  }
  const { paths, truncated } = flattenPayloadPaths(body)
  const byPath = new Map(paths.map((p) => [p.path, p]))

  it("lists every value with a path that getByPath can read back", () => {
    expect(truncated).toBe(false)
    for (const entry of paths) {
      expect(getByPath(body, entry.path)).not.toBeUndefined()
    }
    expect(byPath.get("contact.First Name")?.preview).toBe("Jane")
    expect(byPath.get("contact.e\\.mail")?.preview).toBe("j@x.dk")
  })

  it("keeps lists of plain values as one entry and walks lists of objects by position", () => {
    expect(byPath.get("tags")).toMatchObject({ type: "list", preview: "roof, window" })
    expect(byPath.get("answers.0.a")).toMatchObject({ positional: true, preview: "120" })
    expect(byPath.get("name")?.positional).toBe(false)
  })

  it("marks empty values and reads number, boolean and null types", () => {
    expect(byPath.get("note")?.empty).toBe(true)
    expect(byPath.get("age")).toMatchObject({ type: "number", preview: "41" })
    expect(byPath.get("optin")).toMatchObject({ type: "boolean" })
    expect(byPath.get("nothing")).toMatchObject({ type: "null", empty: true })
  })

  it("stops at the cap and says so", () => {
    const wide = Object.fromEntries(Array.from({ length: 400 }, (_, i) => [`k${i}`, "v"]))
    const result = flattenPayloadPaths(wide)
    expect(result.paths).toHaveLength(MAX_PAYLOAD_PATHS)
    expect(result.truncated).toBe(true)
  })

  it("clips long previews", () => {
    const long = flattenPayloadPaths({ a: "x".repeat(200) }).paths[0]
    expect(long.preview.length).toBeLessThanOrEqual(60)
  })
})

describe("suggestMappings", () => {
  const { paths } = flattenPayloadPaths({
    "Your Name": "Jane",
    contact: { mail: "j@x.dk", mobile: "123" },
    services: ["roof"],
    budget_dkk: 5000,
    id: "abc",
  })

  it("matches by the last key, ignoring case and punctuation", () => {
    const result = suggestMappings(paths, [
      { target: "fullName" },
      { target: "email" },
      { target: "phone" },
      { target: "externalId" },
    ])
    expect(result).toEqual({
      fullName: "Your Name",
      email: "contact.mail",
      phone: "contact.mobile",
      externalId: "id",
    })
  })

  it("gives lists only to serviceIds and uses a custom column's key or label", () => {
    const result = suggestMappings(paths, [
      { target: "serviceIds" },
      { target: "customFields.budget", names: ["budget"] },
    ])
    expect(result.serviceIds).toBe("services")
    expect(result["customFields.budget"]).toBeUndefined()
    const byLabel = suggestMappings(paths, [
      { target: "customFields.budget", names: ["Budget DKK"] },
    ])
    expect(byLabel["customFields.budget"]).toBe("budget_dkk")
  })

  it("uses each path once", () => {
    const { paths: same } = flattenPayloadPaths({ name: "Jane" })
    const result = suggestMappings(same, [
      { target: "fullName" },
      { target: "companyName", names: ["name"] },
    ])
    expect(Object.keys(result)).toEqual(["fullName"])
  })
})
