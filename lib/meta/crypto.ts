import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

function getEncryptionKeyBuffer(): Buffer | null {
  const key =
    process.env.ACCOUNT_CONFIG_ENCRYPTION_KEY ||
    process.env.DASHBOARD_CONFIG_ENCRYPTION_KEY
  if (!key) return null
  return createHash("sha256").update(String(key)).digest()
}

export function encryptSecret(value: string): string {
  const normalized = String(value || "").trim()
  if (!normalized) return ""

  const key = getEncryptionKeyBuffer()
  if (!key) {
    throw new Error(
      "Missing ACCOUNT_CONFIG_ENCRYPTION_KEY. Set it before saving account credentials."
    )
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptSecret(value: string): string {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (!raw.startsWith("enc:v1:")) return raw

  const key = getEncryptionKeyBuffer()
  if (!key) {
    throw new Error(
      "Missing ACCOUNT_CONFIG_ENCRYPTION_KEY. Cannot decrypt saved account credentials."
    )
  }

  const parts = raw.split(":")
  if (parts.length !== 5) return ""

  const iv = Buffer.from(parts[2], "base64")
  const tag = Buffer.from(parts[3], "base64")
  const encrypted = Buffer.from(parts[4], "base64")

  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
}
