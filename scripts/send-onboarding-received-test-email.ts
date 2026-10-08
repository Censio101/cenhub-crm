/**
 * Send a sample onboarding confirmation email.
 * Run: npx tsx scripts/send-onboarding-received-test-email.ts [recipient]
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local")
    const content = readFileSync(envPath, "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator === -1) continue
      const key = trimmed.slice(0, separator)
      const value = trimmed.slice(separator + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import { loadWorkspaceIntegrations } from "../lib/admin/workspace-integrations"
import type { OnboardingApplicationRow } from "../lib/db/types"
import { sendOnboardingApplicationReceivedEmail } from "../lib/email/send-onboarding-application-received-email"
import { createAdminClient } from "../lib/supabase/admin"

function mockApplication(to: string): OnboardingApplicationRow {
  const now = new Date().toISOString()
  return {
    id: "00000000-0000-4000-8000-000000000001",
    status: "pending",
    source: "public_form",
    submitted_at: now,
    company_name: "Eksempel ApS",
    cvr: "12345678",
    contact_full_name: "Yasir",
    contact_email: to.trim().toLowerCase(),
    contact_phone: "12345678",
    address: "Eksempelvej 1",
    zip_code: "2100",
    city: "København",
    country: "DK",
    website_url: "https://example.dk",
    consent_given: true,
    notes: null,
    rejection_reason: null,
    organization_id: null,
    approved_by: null,
    approved_at: null,
    submitter_ip_hash: null,
    created_at: now,
    updated_at: now,
  }
}

async function main() {
  const to = process.argv[2]?.trim() || "yasir@censio.dk"
  const admin = createAdminClient()
  const settings = await loadWorkspaceIntegrations(admin)

  if (!settings.mailConfigured) {
    console.error("Mailgun is not configured in workspace integrations.")
    process.exit(1)
  }

  await sendOnboardingApplicationReceivedEmail(settings, mockApplication(to))
  console.log(`Onboarding confirmation test email sent to ${to}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
