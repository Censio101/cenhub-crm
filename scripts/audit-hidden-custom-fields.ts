/**
 * Documents whether authenticated Supabase clients can read full custom_fields JSON
 * (including org-hidden keys). Run after login fixtures exist: npm run db:verify-tenant-isolation pattern.
 *
 * Run: npx tsx scripts/audit-hidden-custom-fields.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const i = trimmed.indexOf("=")
      if (i < 0) continue
      const key = trimmed.slice(0, i)
      if (!process.env[key]) process.env[key] = trimmed.slice(i + 1)
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

console.log(`
Hidden custom columns are stripped in API responses (stripHiddenCustomFields).
Direct PostgREST SELECT on leads.custom_fields may still return hidden keys for authenticated users.

Mitigation options (roadmap):
  1) Keep all client reads via /api/leads (current product path).
  2) DB: per-org JSON redaction (complex) or move sensitive keys to restricted storage.

Verify manually: log in as client_user, DevTools → Network → compare /api/leads JSON vs supabase.from('leads').select('custom_fields').
See docs/SECURITY.md.
`)
