import { describe, expect, it } from "vitest"

import {
  buildImageLinkValue,
  normalizeImageFieldValue,
  normalizeImageLinkUrl,
  parseImageCellValue,
  validateImageFieldValue,
} from "@/lib/lead-sheet/image-link"

describe("normalizeImageLinkUrl", () => {
  it("keeps http and https URLs", () => {
    expect(normalizeImageLinkUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg")
    expect(normalizeImageLinkUrl("http://example.com/a")).toBe("http://example.com/a")
  })

  it("adds https when the scheme is missing", () => {
    expect(normalizeImageLinkUrl("example.com/photo")).toBe("https://example.com/photo")
    expect(normalizeImageLinkUrl("example.com:8080/x")).toBe("https://example.com:8080/x")
  })

  it("rejects unsafe or malformed input", () => {
    expect(normalizeImageLinkUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeImageLinkUrl("JavaScript:alert(1)")).toBeNull()
    expect(normalizeImageLinkUrl("data:text/html;base64,AAAA")).toBeNull()
    expect(normalizeImageLinkUrl("mailto:a@b.com")).toBeNull()
    expect(normalizeImageLinkUrl("//evil.com")).toBeNull()
    expect(normalizeImageLinkUrl("")).toBeNull()
    expect(normalizeImageLinkUrl("   ")).toBeNull()
    expect(normalizeImageLinkUrl(`https://example.com/${"a".repeat(3000)}`)).toBeNull()
  })
})

describe("buildImageLinkValue", () => {
  it("trims text and normalizes the URL", () => {
    expect(buildImageLinkValue("  Image 1 ", "example.com/a")).toEqual({
      ok: true,
      value: { text: "Image 1", url: "https://example.com/a" },
    })
  })

  it("allows empty text", () => {
    expect(buildImageLinkValue("", "https://example.com")).toMatchObject({ ok: true })
  })

  it("reports missing and invalid URLs", () => {
    expect(buildImageLinkValue("x", "")).toEqual({ ok: false, error: "urlRequired" })
    expect(buildImageLinkValue("x", "javascript:alert(1)")).toEqual({
      ok: false,
      error: "urlInvalid",
    })
  })

  it("rejects overly long text", () => {
    expect(buildImageLinkValue("a".repeat(81), "https://example.com")).toEqual({
      ok: false,
      error: "textTooLong",
    })
  })
})

describe("parseImageCellValue", () => {
  it("reads links, legacy files, and empty values", () => {
    expect(parseImageCellValue({ text: "Image 1", url: "https://example.com" })).toEqual({
      kind: "link",
      text: "Image 1",
      url: "https://example.com/",
    })
    expect(parseImageCellValue("org/lead/photo.jpg")).toEqual({
      kind: "file",
      path: "org/lead/photo.jpg",
    })
    expect(parseImageCellValue(null)).toEqual({ kind: "empty" })
    expect(parseImageCellValue("  ")).toEqual({ kind: "empty" })
  })

  it("never returns an unsafe link", () => {
    expect(parseImageCellValue({ text: "x", url: "javascript:alert(1)" })).toEqual({
      kind: "empty",
    })
  })
})

describe("validateImageFieldValue / normalizeImageFieldValue", () => {
  it("accepts links and legacy paths", () => {
    expect(validateImageFieldValue({ text: "Image 1", url: "https://example.com" })).toBeNull()
    expect(validateImageFieldValue({ url: "example.com" })).toBeNull()
    expect(validateImageFieldValue("org/lead/photo.jpg")).toBeNull()
  })

  it("rejects bad shapes and URLs", () => {
    expect(validateImageFieldValue({ text: "x", url: "javascript:alert(1)" })).toMatch(/URL/)
    expect(validateImageFieldValue({ text: 5, url: "https://example.com" })).toMatch(/text/)
    expect(validateImageFieldValue(["https://example.com"])).toMatch(/Expected/)
    expect(validateImageFieldValue(42)).toMatch(/Expected/)
  })

  it("stores the canonical form", () => {
    expect(normalizeImageFieldValue({ text: " Image 1 ", url: "example.com" })).toEqual({
      text: "Image 1",
      url: "https://example.com/",
    })
    expect(normalizeImageFieldValue("org/lead/photo.jpg")).toBe("org/lead/photo.jpg")
  })
})
