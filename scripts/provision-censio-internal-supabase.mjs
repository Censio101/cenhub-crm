#!/usr/bin/env node
/**
 * Opretter Supabase-projektet "Censio Internal", kører schema, sætter Vercel env.
 *
 * Kræver (engang):
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *
 * Valgfrit:
 *   SUPABASE_ORG_ID       — udelades → første org
 *   SUPABASE_DB_PASSWORD  — udelades → genereres
 *   VERCEL_PROJECT        — default censio-internal
 *   SKIP_VERCEL_ENV=1
 */
import { readFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API = "https://api.supabase.com/v1"

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
if (!token) {
  console.error(
    "Mangler SUPABASE_ACCESS_TOKEN. Opret på https://supabase.com/dashboard/account/tokens og kør igen."
  )
  process.exit(1)
}

async function api(method, route, body) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!response.ok) {
    throw new Error(`${method} ${route} → ${response.status}: ${text}`)
  }
  return json
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  let orgId = process.env.SUPABASE_ORG_ID?.trim()
  if (!orgId) {
    const orgs = await api("GET", "/organizations")
    orgId = orgs?.[0]?.id
    if (!orgId) throw new Error("Ingen Supabase-organisation fundet.")
    console.log(`Bruger organisation: ${orgs[0].name}`)
  }

  const dbPass =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    randomBytes(18).toString("base64url").slice(0, 24)

  const projectName = "Censio Internal"
  console.log(`Opretter Supabase-projekt: ${projectName}…`)

  let project
  try {
    project = await api("POST", "/projects", {
      organization_id: orgId,
      name: projectName,
      db_pass: dbPass,
      region: "eu-central-1",
    })
  } catch (error) {
    const message = String(error)
    if (message.includes("already") || message.includes("409")) {
      const projects = await api("GET", "/projects")
      project = projects.find((p) => p.name === projectName)
      if (!project) throw error
      console.log("Projekt findes allerede — fortsætter med eksisterende.")
    } else {
      throw error
    }
  }

  const ref = project.ref ?? project.id
  console.log(`Project ref: ${ref}`)

  let status = project.status
  for (let attempt = 0; attempt < 60 && status !== "ACTIVE_HEALTHY"; attempt += 1) {
    if (attempt > 0) await sleep(10_000)
    const current = await api("GET", `/projects/${ref}`)
    status = current.status
    console.log(`Status: ${status}`)
  }
  if (status !== "ACTIVE_HEALTHY") {
    throw new Error(`Projektet blev ikke klar (status: ${status}). Prøv igen om lidt.`)
  }

  const keys = await api("GET", `/projects/${ref}/api-keys`)
  const serviceRole = keys.find((k) => k.name === "service_role")?.api_key
  const url = `https://${ref}.supabase.co`
  if (!serviceRole) throw new Error("Kunne ikke hente service_role key.")

  const migrationPath = path.join(
    __dirname,
    "../supabase/migrations/20261003000000_censio_internal.sql"
  )
  const sql = await readFile(migrationPath, "utf8")

  console.log("Kører SQL-migration via Supabase Management API…")
  await api("POST", `/projects/${ref}/database/query`, { query: sql })
  await api("POST", `/projects/${ref}/database/query`, {
    query: "NOTIFY pgrst, 'reload schema'",
  })

  console.log("Supabase er klar.")
  console.log(`SUPABASE_URL=${url}`)
  console.log(`SUPABASE_SERVICE_ROLE_KEY=(service_role — gemt til Vercel hvis konfigureret)`)

  const storePath = path.join(process.cwd(), ".data", "cenhub-store.json")
  try {
    readFileSync(storePath)
    process.env.SUPABASE_URL = url
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole
    execSync("node scripts/migrate-store-to-supabase.mjs", {
      stdio: "inherit",
      env: process.env,
    })
  } catch {
    console.log("Ingen lokal .data/cenhub-store.json — springer data-migration over.")
  }

  if (process.env.SKIP_VERCEL_ENV === "1") return

  const vercelProject = process.env.VERCEL_PROJECT?.trim() || "censio-internal"
  const addEnv = (name, value) => {
    try {
      execSync(`npx vercel env add ${name} production --force`, {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        cwd: path.join(__dirname, ".."),
        env: process.env,
      })
      execSync(`npx vercel env add ${name} preview --force`, {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        cwd: path.join(__dirname, ".."),
        env: process.env,
      })
    } catch (error) {
      console.warn(`Vercel env ${name}:`, error.message)
    }
  }

  console.log(`Sætter Vercel env på ${vercelProject}…`)
  process.chdir(path.join(__dirname, ".."))
  addEnv("SUPABASE_URL", url)
  addEnv("SUPABASE_SERVICE_ROLE_KEY", serviceRole)

  console.log("\nFærdig. Redeploy på Vercel for at aktivere databasen.")
  console.log(`Gem DB-password et sikkert sted (postgres): ${dbPass}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
