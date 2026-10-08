/**
 * Reset Censio admin login (kontakt@censio.dk) and mark password setup complete.
 * Run: npx tsx scripts/fix-admin-login.ts
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createAdminClient } from "../lib/supabase/admin"

const ADMIN_EMAIL = "kontakt@censio.dk"
const DEFAULT_PASSWORD = "Censio@123"

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
  const password = process.env.ADMIN_RESET_PASSWORD ?? DEFAULT_PASSWORD

  const userId = await findUserIdByEmail(admin, ADMIN_EMAIL)
  if (!userId) {
    throw new Error(`No auth user for ${ADMIN_EMAIL}. Run npm run db:setup-admin first.`)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { password_setup_complete: true },
  })
  if (updateError) throw updateError

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

  console.log(`Admin ${ADMIN_EMAIL} is ready. Password reset to env ADMIN_RESET_PASSWORD or default.`)
  console.log("Sign in at http://localhost:3000/login → redirects to /klienter")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
