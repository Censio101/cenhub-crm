import { createHmac, timingSafeEqual } from "node:crypto"

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.META_APP_SECRET?.trim()
  if (!secret) return false
  if (!signatureHeader?.startsWith("sha256=")) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  const received = signatureHeader.slice("sha256=".length)

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"))
  } catch {
    return false
  }
}
