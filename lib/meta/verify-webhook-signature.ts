import { createHmac, timingSafeEqual } from "node:crypto"

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.META_APP_SECRET?.trim()
  if (!secret) {
    // Allow in dev when secret not configured; production should set META_APP_SECRET
    return process.env.NODE_ENV !== "production"
  }
  if (!signatureHeader?.startsWith("sha256=")) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  const received = signatureHeader.slice("sha256=".length)

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"))
  } catch {
    return false
  }
}
