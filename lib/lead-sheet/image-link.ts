/**
 * Image custom fields hold a hyperlink: visible text (for example "Image 1") plus a URL.
 * Older leads may still hold a storage path string from the previous upload flow.
 */

export type ImageLinkValue = { text: string; url: string }

export const IMAGE_LINK_TEXT_MAX = 80
export const IMAGE_LINK_URL_MAX = 2048

/**
 * Returns a safe absolute http(s) URL, or null when the input is not acceptable.
 * A missing scheme defaults to https; any other scheme (javascript:, data:, …) is rejected.
 */
export function normalizeImageLinkUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > IMAGE_LINK_URL_MAX) return null

  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    // "scheme:" followed by a non-digit is a real scheme (javascript:, mailto:, data:).
    // "host:8080" has a digit after the colon and is treated as a bare host.
    if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(candidate) || candidate.startsWith("//")) return null
    candidate = `https://${candidate}`
  }

  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!url.hostname) return null
    return url.toString()
  } catch {
    return null
  }
}

export type ImageCellValue =
  { kind: "empty" } | { kind: "link"; text: string; url: string } | { kind: "file"; path: string }

/** Interprets a stored value. Links are re-validated so unsafe URLs never render. */
export function parseImageCellValue(value: unknown): ImageCellValue {
  if (typeof value === "string") {
    return value.trim() ? { kind: "file", path: value } : { kind: "empty" }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.url === "string") {
      const url = normalizeImageLinkUrl(record.url)
      if (url) {
        return {
          kind: "link",
          text: typeof record.text === "string" ? record.text.trim() : "",
          url,
        }
      }
    }
  }
  return { kind: "empty" }
}

export type BuildImageLinkResult =
  | { ok: true; value: ImageLinkValue }
  | { ok: false; error: "urlRequired" | "urlInvalid" | "textTooLong" }

/** Validates form input and returns the value to store. */
export function buildImageLinkValue(text: string, rawUrl: string): BuildImageLinkResult {
  const trimmedText = text.trim()
  if (trimmedText.length > IMAGE_LINK_TEXT_MAX) return { ok: false, error: "textTooLong" }
  if (!rawUrl.trim()) return { ok: false, error: "urlRequired" }
  const url = normalizeImageLinkUrl(rawUrl)
  if (!url) return { ok: false, error: "urlInvalid" }
  return { ok: true, value: { text: trimmedText, url } }
}

/** Server-side check for an image value coming from a request body. */
export function validateImageFieldValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.length > 0 ? null : "Expected image link"
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Expected image link"
  }
  const record = value as Record<string, unknown>
  if (record.text !== undefined && typeof record.text !== "string") {
    return "Invalid link text"
  }
  if (typeof record.text === "string" && record.text.trim().length > IMAGE_LINK_TEXT_MAX) {
    return "Link text is too long"
  }
  if (typeof record.url !== "string" || normalizeImageLinkUrl(record.url) === null) {
    return "Invalid link URL"
  }
  return null
}

/** Canonical form to store: trimmed text and normalized URL. Legacy strings pass through. */
export function normalizeImageFieldValue(value: unknown): unknown {
  if (typeof value === "string") return value
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const url = typeof record.url === "string" ? normalizeImageLinkUrl(record.url) : null
    if (url) {
      return { text: typeof record.text === "string" ? record.text.trim() : "", url }
    }
  }
  return value
}

/** True for an image object with no URL (treated as "cleared"). */
export function isEmptyImageObject(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.url === "string" && record.url.trim() === ""
}
