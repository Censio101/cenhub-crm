/**
 * Create the first Censio admin (kontakt@censio.dk).
 * Run: npm run db:setup-admin
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createAdminClient } from "../lib/supabase/admin"

const ADMIN_EMAIL = "kontakt@censio.dk"
const SITE_URL = process.env.CRM_SITE_URL ?? "https://cenhub-crm.vercel.app"

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

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) return match.id
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

async function main() {
  loadEnvLocal()
  const admin = createAdminClient()

  let userId = await findUserIdByEmail(admin, ADMIN_EMAIL)

  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(ADMIN_EMAIL, {
      redirectTo: `${SITE_URL}/auth/callback`,
    })
    if (error) throw error
    userId = data.user.id
    console.log(`Invite sent to ${ADMIN_EMAIL}`)
  } else {
    console.log(`User already exists for ${ADMIN_EMAIL}`)
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      organization_id: null,
      role: "censio_admin",
      email: ADMIN_EMAIL,
      full_name: "Censio Admin",
    },
    { onConflict: "id" }
  )

  if (profileError) throw profileError

  console.log(`Linked ${ADMIN_EMAIL} as censio_admin`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
