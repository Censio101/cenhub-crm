import { describe, expect, it } from "vitest"

import { isValidSourcePath } from "@/lib/leads/funnel-mapping"
import { escapePathSegment, getByPath, splitSourcePath } from "@/lib/leads/source-path"

describe("splitSourcePath", () => {
  it("splits on dots and keeps spaces inside a key", () => {
    expect(splitSourcePath("contact.First Name")).toEqual(["contact", "First Name"])
  })

  it("treats an escaped dot as part of the key", () => {
    expect(splitSourcePath("a\\.b.c")).toEqual(["a.b", "c"])
    expect(splitSourcePath("a\\\\.b")).toEqual(["a\\", "b"])
  })

  it("round-trips through escapePathSegment", () => {
    const key = "e.mail\\x"
    expect(splitSourcePath(escapePathSegment(key))).toEqual([key])
  })
})

describe("getByPath", () => {
  const body = { "Your Name": "Jane", "e.mail": "j@x.dk", a: { b: [{ c: 1 }] } }

  it("reads keys with spaces and escaped dots", () => {
    expect(getByPath(body, "Your Name")).toBe("Jane")
    expect(getByPath(body, "e\\.mail")).toBe("j@x.dk")
    expect(getByPath(body, "a.b.0.c")).toBe(1)
  })

  it("never reaches object internals", () => {
    expect(getByPath(body, "__proto__")).toBeUndefined()
    expect(getByPath(body, "constructor")).toBeUndefined()
    expect(getByPath(body, "a.constructor.name")).toBeUndefined()
    expect(getByPath(body, "toString")).toBeUndefined()
  })
})

describe("isValidSourcePath", () => {
  it("accepts names with spaces and escaped dots", () => {
    expect(isValidSourcePath("First Name")).toBe(true)
    expect(isValidSourcePath("form.Your Email")).toBe(true)
    expect(isValidSourcePath("e\\.mail")).toBe(true)
  })

  it("rejects empty segments and control characters", () => {
    expect(isValidSourcePath("a..b")).toBe(false)
    expect(isValidSourcePath(".a")).toBe(false)
    expect(isValidSourcePath("a. .b")).toBe(false)
    expect(isValidSourcePath("a\nb")).toBe(false)
    expect(isValidSourcePath("")).toBe(false)
  })
})
