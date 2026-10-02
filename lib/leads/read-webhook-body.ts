/** Largest request body a lead webhook reads (about 1 MB). */
export const MAX_WEBHOOK_BODY_BYTES = 1_000_000

export type WebhookBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 400 | 413 | 415; error: string }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/** `a=1&a=2&b=x` becomes `{ a: ["1", "2"], b: "x" }`. */
function parseFormEncoded(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of new URLSearchParams(text)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue
    const existing = out[key]
    if (existing === undefined) out[key] = value
    else out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
  }
  return out
}

/**
 * Reads a webhook request as a flat or nested object: JSON, or a form-encoded body. Anything
 * else (multipart, XML, plain text), a top-level list or an oversized body is refused with a
 * reason the admin can read.
 */
export async function readWebhookBody(request: Request): Promise<WebhookBodyResult> {
  const declared = Number(request.headers.get("content-length") ?? 0)
  if (declared > MAX_WEBHOOK_BODY_BYTES) {
    return { ok: false, status: 413, error: "The request body is too large" }
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase()
  if (contentType.includes("multipart/")) {
    return {
      ok: false,
      status: 415,
      error: "Multipart bodies are not supported; send JSON or a form-encoded body",
    }
  }

  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, error: "The request body could not be read" }
  }
  if (text.length > MAX_WEBHOOK_BODY_BYTES) {
    return { ok: false, status: 413, error: "The request body is too large" }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return { ok: true, body: parseFormEncoded(text) }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" }
  }
  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      status: 400,
      error: "The body must be a JSON object (a single lead), not a list or a plain value",
    }
  }
  return { ok: true, body: parsed }
}
