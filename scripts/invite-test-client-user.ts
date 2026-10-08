/**
 * Create or update a client test user for local QA (client portal).
 * Run: npx tsx scripts/invite-test-client-user.ts
 *
 * Env (optional):
 *   TEST_CLIENT_EMAIL (default yasir@censio.dk)
 *   TEST_CLIENT_ORG_SLUG — if set, attach to this org; else first org in DB
 *   TEST_CLIENT_PASSWORD — if set with method password; else a random one is printed once
 *   TEST_CLIENT_METHOD — "password" (default) or "email" (sends invite email)
 */
import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { inviteOrCreateUser } from "../lib/db/admin-users"
import { createAdminClient } from "../lib/supabase/admin"

const DEFAULT_EMAIL = "yasir@censio.dk"
const DEFAULT_NAME = "Yasir Test"

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

async function main() {
  loadEnvLocal()
  const admin = createAdminClient()

  const email = (process.env.TEST_CLIENT_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase()
  const fullName = process.env.TEST_CLIENT_NAME?.trim() || DEFAULT_NAME
  const method = process.env.TEST_CLIENT_METHOD === "email" ? "email" : "password"
  const orgSlug = process.env.TEST_CLIENT_ORG_SLUG?.trim()

  let organizationId: string
  let organizationName: string

  if (orgSlug) {
    const { data: org, error } = await admin
      .from("organizations")
      .select("id, name")
      .eq("slug", orgSlug)
      .maybeSingle()
    if (error) throw error
    if (!org) throw new Error(`No organization with slug "${orgSlug}"`)
    organizationId = org.id
    organizationName = org.name
  } else {
    const { data: orgs, error } = await admin
      .from("organizations")
      .select("id, name, slug")
      .order("created_at", { ascending: true })
      .limit(1)
    if (error) throw error
    const org = orgs?.[0]
    if (!org) {
      throw new Error("No organizations in DB. Run npm run db:seed or create a client in admin first.")
    }
    organizationId = org.id
    organizationName = org.name
    console.log(`Using organization: ${org.name} (${org.slug})`)
  }

  let password = process.env.TEST_CLIENT_PASSWORD
  if (method === "password" && (!password || password.length < 8)) {
    password = `Test-${randomBytes(4).toString("hex")}!`
  }

  const result = await inviteOrCreateUser(admin, {
    email,
    role: "client_admin",
    organizationId,
    organizationName,
    method,
    password: method === "password" ? password : undefined,
    fullName,
  })

  console.log("")
  console.log("Client test user ready")
  console.log(`  Email:    ${email}`)
  console.log(`  Name:     ${fullName}`)
  console.log(`  Role:     client_admin`)
  console.log(`  Org:      ${organizationName}`)
  console.log(`  User id:  ${result.userId}`)
  console.log(`  Method:   ${result.method}`)
  if (method === "password" && password) {
    console.log(`  Password: ${password}`)
    console.log("")
    console.log("Sign in at http://localhost:3000/login")
  } else {
    console.log("")
    console.log("Check inbox for invite link, then complete /auth/setup-password flow.")
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
